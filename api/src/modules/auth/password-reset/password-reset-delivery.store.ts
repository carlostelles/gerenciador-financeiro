import { Injectable, Logger } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { PasswordReset, PasswordResetLimit } from './password-reset.entity';
import {
  DeliveryErrorCode as Code,
  DeliveryStatus as State,
  erasedEnvelope,
  PasswordResetDelivery as Job,
} from './password-reset-delivery.entity';
import {
  PasswordResetPayloadCipher,
  PayloadContext,
  PayloadEnvelope,
  PayloadError,
} from './password-reset-payload.cipher';

export interface DeliveryLease {
  id: string;
  recuperacaoId: number;
  owner: string;
  version: number;
}
export interface PreparedDelivery {
  email: string;
  token: string;
  expiresAt: Date;
  deadline: Date;
}
const preparatory = (job: Job) =>
  [State.PENDING, State.LEASED].includes(job.status);

@Injectable()
export class PasswordResetDeliveryStore {
  private readonly logger = new Logger(PasswordResetDeliveryStore.name);
  constructor(
    private readonly db: DataSource,
    private readonly cipher: PasswordResetPayloadCipher,
  ) {}

  assertConfigured(): void {
    this.cipher.assertConfigured();
  }

  async enqueue(
    manager: EntityManager,
    row: PasswordReset,
    email: string,
    token: string,
  ): Promise<void> {
    const id = randomUUID();
    const envelope = this.cipher.seal(this.context(id, row), { email, token });
    const now = await this.now(manager);
    await manager.insert(Job, {
      id,
      recuperacaoId: row.id,
      status: State.PENDING,
      createdAt: now,
      availableAt: now,
      ...envelope,
    });
  }

  private context(id: string, row: PasswordReset): PayloadContext {
    return {
      id,
      recuperacaoId: row.id,
      usuarioId: row.usuarioId,
      digest: row.digest,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      credenciaisVersao: row.credenciaisVersao,
    };
  }
  private async now(manager: EntityManager): Promise<Date> {
    const [row] = await manager.query('SELECT UTC_TIMESTAMP(3) AS now');
    return new Date(row.now);
  }

  async claim(owner: string): Promise<DeliveryLease | null> {
    // Job-only transaction. Release its lock BEFORE looking up/locking a user.
    return this.db.transaction(async (manager) => {
      const [row] = await manager.query(`SELECT id FROM recuperacao_envios
        WHERE (status = 'pending' AND availableAt <= UTC_TIMESTAMP(3))
           OR (status = 'leased' AND DATE_ADD(leaseUntil, INTERVAL IF(attempts < 2, 1, 4) SECOND) <= UTC_TIMESTAMP(3))
        ORDER BY availableAt, id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!row) return null;
      await manager.query(
        `UPDATE recuperacao_envios SET status = 'leased', leaseOwner = ?,
        leaseVersion = leaseVersion + 1, attempts = attempts + 1,
        leaseUntil = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 SECOND) WHERE id = ?`,
        [owner, row.id],
      );
      const job = await manager.findOneByOrFail(Job, { id: row.id });
      return {
        id: job.id,
        recuperacaoId: job.recuperacaoId,
        owner,
        version: job.leaseVersion,
      };
    });
  }

  async renew(lease: DeliveryLease): Promise<boolean> {
    const result = await this.db
      .createQueryBuilder()
      .update(Job)
      .set({
        leaseUntil: () => 'DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 SECOND)',
      })
      .where(
        'id = :id AND status = :status AND leaseOwner = :owner AND leaseVersion = :version AND leaseUntil > UTC_TIMESTAMP(3)',
        { ...lease, status: State.LEASED },
      )
      .execute();
    return result.affected === 1;
  }

  private owns(
    job: Job,
    lease: DeliveryLease,
    now: Date,
    state: State,
  ): boolean {
    return (
      job.status === state &&
      job.leaseOwner === lease.owner &&
      job.leaseVersion === lease.version &&
      !!job.leaseUntil &&
      job.leaseUntil > now
    );
  }

  private async locked<T>(
    id: string,
    action: (
      manager: EntityManager,
      user: Usuario,
      reset: PasswordReset,
      job: Job,
    ) => Promise<T>,
  ): Promise<T | null> {
    const hint = await this.db
      .getRepository(Job)
      .findOne({ where: { id }, relations: { recuperacao: true } });
    if (!hint) return null;
    return this.db.transaction(async (manager) => {
      const user = await manager.findOne(Usuario, {
        where: { id: hint.recuperacao.usuarioId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return null;
      const reset = await manager.findOne(PasswordReset, {
        where: { id: hint.recuperacaoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reset) return null;
      const job = await manager.findOne(Job, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) return null;
      return action(manager, user, reset, job);
    });
  }

  private async end(
    manager: EntityManager,
    reset: PasswordReset,
    job: Job,
    status: State,
    code: Code | null,
    now: Date,
  ): Promise<void> {
    // Only this attempt; never revoke a newer issuance after a late failure.
    if (status !== State.ACCEPTED && !reset.consumedAt && !reset.revokedAt) {
      await manager.update(PasswordReset, reset.id, { revokedAt: now });
    }
    await manager.update(Job, job.id, {
      status,
      lastErrorCode: code,
      completedAt: now,
      leaseUntil: null,
      ...erasedEnvelope,
    });
  }

  async prepare(
    lease: DeliveryLease,
    stopped: () => boolean = () => false,
  ): Promise<PreparedDelivery | null> {
    return this.locked(lease.id, async (manager, user, reset, job) => {
      let now = await this.now(manager);
      if (!this.owns(job, lease, now, State.LEASED)) return null;
      if (
        !user.ativo ||
        reset.consumedAt ||
        reset.revokedAt ||
        user.credenciaisVersao !== reset.credenciaisVersao
      ) {
        await this.end(
          manager,
          reset,
          job,
          State.CANCELLED,
          Code.INVALIDATED,
          now,
        );
        return null;
      }
      if (reset.expiresAt.getTime() - now.getTime() <= 5000) {
        await this.end(manager, reset, job, State.EXPIRED, Code.TTL, now);
        return null;
      }
      if (job.attempts > 3) {
        await this.end(
          manager,
          reset,
          job,
          State.FAILED,
          Code.PREPARATION,
          now,
        );
        return null;
      }
      let payload: { email: string; token: string };
      try {
        payload = this.cipher.open(
          this.context(job.id, reset),
          job as PayloadEnvelope,
        );
      } catch (error) {
        if (error instanceof PayloadError && error.code === 'key_unavailable') {
          // Configuration incidents wait within the original TTL, not the preparation retry budget.
          await manager.update(Job, job.id, {
            status: State.PENDING,
            attempts: Math.max(0, job.attempts - 1),
            leaseOwner: null,
            leaseUntil: null,
            availableAt: new Date(now.getTime() + 1000),
            lastErrorCode: Code.KEY_UNAVAILABLE,
          });
          return null;
        }
        await this.end(
          manager,
          reset,
          job,
          State.FAILED,
          Code.PAYLOAD_INVALID,
          now,
        );
        return null;
      }
      if (payload.email !== user.email) {
        await this.end(
          manager,
          reset,
          job,
          State.CANCELLED,
          Code.INVALIDATED,
          now,
        );
        return null;
      }
      now = await this.now(manager);
      if (stopped() || !this.owns(job, lease, now, State.LEASED)) return null;
      if (reset.expiresAt.getTime() - now.getTime() <= 5000) {
        await this.end(manager, reset, job, State.EXPIRED, Code.TTL, now);
        return null;
      }
      const deadline = new Date(now.getTime() + 5000);
      // Durable point of no replay. A failed/unknown commit MUST NOT authorize a call.
      await manager.update(Job, job.id, {
        status: State.DISPATCHING,
        dispatchStartedAt: now,
        dispatchDeadlineAt: deadline,
        ...erasedEnvelope,
      });
      return { ...payload, expiresAt: reset.expiresAt, deadline };
    });
  }

  async retry(lease: DeliveryLease): Promise<void> {
    await this.locked(lease.id, async (manager, _user, reset, job) => {
      const now = await this.now(manager);
      if (!this.owns(job, lease, now, State.LEASED)) return;
      if (job.attempts >= 3) {
        await this.end(
          manager,
          reset,
          job,
          State.FAILED,
          Code.PREPARATION,
          now,
        );
        return;
      }
      await manager.update(Job, job.id, {
        status: State.PENDING,
        leaseOwner: null,
        leaseUntil: null,
        availableAt: new Date(
          now.getTime() + (job.attempts === 1 ? 1000 : 4000) + randomInt(251),
        ),
        lastErrorCode: Code.PREPARATION,
      });
    });
  }

  async finish(
    lease: DeliveryLease,
    status: State.ACCEPTED | State.FAILED | State.UNKNOWN | State.EXPIRED,
  ): Promise<boolean> {
    return (
      (await this.locked(lease.id, async (manager, _user, reset, job) => {
        const now = await this.now(manager);
        if (!this.owns(job, lease, now, State.DISPATCHING)) return false;
        const code =
          status === State.ACCEPTED
            ? null
            : status === State.FAILED
              ? Code.REJECTED
              : status === State.EXPIRED
                ? Code.TTL
                : Code.UNCERTAIN;
        await this.end(manager, reset, job, status, code, now);
        return true;
      })) ?? false
    );
  }

  async maintain(): Promise<void> {
    const candidates: { id: string }[] = await this.db
      .query(`SELECT j.id FROM recuperacao_envios j
      JOIN recuperacoes_senha r ON r.id = j.recuperacaoId
      WHERE (j.status = 'dispatching' AND j.dispatchDeadlineAt <= UTC_TIMESTAMP(3))
         OR (j.status IN ('pending','leased') AND (r.expiresAt <= UTC_TIMESTAMP(3) OR r.revokedAt IS NOT NULL OR r.consumedAt IS NOT NULL))
      ORDER BY j.createdAt LIMIT 50`);
    for (const candidate of candidates)
      await this.locked(candidate.id, async (manager, _user, reset, job) => {
        const now = await this.now(manager);
        if (
          job.status === State.DISPATCHING &&
          job.dispatchDeadlineAt &&
          job.dispatchDeadlineAt <= now
        ) {
          await this.end(
            manager,
            reset,
            job,
            State.UNKNOWN,
            Code.UNCERTAIN,
            now,
          );
        } else if (
          preparatory(job) &&
          (reset.expiresAt <= now || reset.revokedAt || reset.consumedAt)
        ) {
          await this.end(
            manager,
            reset,
            job,
            reset.expiresAt <= now ? State.EXPIRED : State.CANCELLED,
            reset.expiresAt <= now ? Code.TTL : Code.INVALIDATED,
            now,
          );
        }
      });
    // Also handles legacy resets without jobs. Always user -> reset -> job, small batches.
    const old: { id: number; usuarioId: number }[] = await this.db
      .query(`SELECT id, usuarioId FROM recuperacoes_senha
      WHERE COALESCE(consumedAt, revokedAt, expiresAt) < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 24 HOUR) ORDER BY id LIMIT 50`);
    for (const hint of old)
      await this.db.transaction(async (manager) => {
        await manager.findOne(Usuario, {
          where: { id: hint.usuarioId },
          lock: { mode: 'pessimistic_write' },
        });
        const reset = await manager.findOne(PasswordReset, {
          where: { id: hint.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!reset) return;
        const job = await manager.findOne(Job, {
          where: { recuperacaoId: reset.id },
          lock: { mode: 'pessimistic_write' },
        });
        const cutoff = (await this.now(manager)).getTime() - 86400000;
        if (
          (reset.consumedAt ?? reset.revokedAt ?? reset.expiresAt).getTime() >=
            cutoff ||
          (job && (!job.completedAt || job.completedAt.getTime() >= cutoff))
        )
          return;
        await manager.delete(PasswordReset, reset.id);
      });
    const buckets: { emailDigest: string }[] = await this.db
      .query(`SELECT emailDigest FROM recuperacao_limites
      WHERE JSON_LENGTH(admissions) = 0 OR CAST(JSON_UNQUOTE(JSON_EXTRACT(admissions, '$[last]')) AS UNSIGNED)
        < TIMESTAMPDIFF(MICROSECOND, '1970-01-01', UTC_TIMESTAMP(3)) / 1000 - 3600000 LIMIT 50`);
    for (const hint of buckets)
      await this.db.transaction(async (manager) => {
        const limit = await manager.findOne(PasswordResetLimit, {
          where: hint,
          lock: { mode: 'pessimistic_write' },
        });
        if (!limit) return;
        const cutoff = (await this.now(manager)).getTime() - 3600000;
        if (limit.admissions.every((time) => time < cutoff))
          await manager.delete(PasswordResetLimit, hint);
      });
  }

  async report(): Promise<void> {
    // Aggregate-only diagnostics; never serialize rows, parameters or driver errors.
    const [counts] = await this.db.query(`SELECT COUNT(*) AS backlog,
      COALESCE(MAX(TIMESTAMPDIFF(SECOND, createdAt, UTC_TIMESTAMP(3))), 0) AS oldestSeconds,
      COALESCE(SUM(lastErrorCode = 'key_unavailable'), 0) AS keyUnavailable
      FROM recuperacao_envios WHERE status IN ('pending','leased')`);
    const terminal = await this.db
      .query(`SELECT status, COUNT(*) AS total FROM recuperacao_envios
      WHERE status IN ('expired','unknown','failed') GROUP BY status`);
    this.logger.log({
      event: 'password_reset_queue',
      backlog: Number(counts.backlog),
      oldestSeconds: Number(counts.oldestSeconds),
      keyUnavailable: Number(counts.keyUnavailable),
      expired: Number(
        terminal.find((row) => row.status === 'expired')?.total || 0,
      ),
      unknown: Number(
        terminal.find((row) => row.status === 'unknown')?.total || 0,
      ),
      failed: Number(
        terminal.find((row) => row.status === 'failed')?.total || 0,
      ),
    });
  }
}
