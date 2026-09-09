import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { HostingerMailService } from './hostinger-mail.service';
import { PasswordReset, PasswordResetLimit } from './password-reset.entity';
import {
  admitEmail,
  digestToken,
  INVALID_RESET,
  PASSWORD_PATTERN,
  RESET_MESSAGE,
} from './password-reset.rules';
import { RedefinirSenhaDto } from './password-reset.dto';
import { PasswordResetDeliveryStore } from './password-reset-delivery.store';

export async function revokePending(
  manager: EntityManager,
  usuarioId: number,
  now: Date,
): Promise<void> {
  await manager.update(
    PasswordReset,
    { usuarioId, consumedAt: IsNull(), revokedAt: IsNull() },
    { revokedAt: now },
  );
  // Caller already owns user/reset locks. A dispatched job can never be replayed.
  await manager.query(
    `UPDATE recuperacao_envios j JOIN recuperacoes_senha r ON r.id = j.recuperacaoId
    SET j.status = 'cancelled', j.completedAt = ?, j.lastErrorCode = 'invalidated',
        j.keyId = NULL, j.nonce = NULL, j.authTag = NULL, j.ciphertext = NULL, j.leaseUntil = NULL
    WHERE r.usuarioId = ? AND j.status IN ('pending','leased')`,
    [now, usuarioId],
  );
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private readonly db: DataSource,
    private readonly mail: HostingerMailService,
    private readonly deliveries: PasswordResetDeliveryStore,
  ) {}

  async request(email: string): Promise<{ message: string }> {
    // Uniform configuration check, including missing/inactive/suppressed accounts.
    this.mail.assertConfigured();
    this.deliveries.assertConfigured();
    const normalized = email.trim().toLowerCase();
    try {
      await this.db.transaction(async (manager) => {
        // MySQL collations may consider accents/case equivalent. Existing accounts
        // must share the canonical recipient bucket, not one bucket per spelling.
        const hint = await manager.findOne(Usuario, {
          where: { email: normalized },
        });
        const emailDigest = digestToken(
          (hint?.email ?? normalized).trim().toLowerCase(),
        );
        // Lock order: recipient limit -> user -> recovery rows -> jobs. No network.
        // Duplicate-key UPDATE acquires X directly; INSERT IGNORE takes S and
        // concurrent promotion to FOR UPDATE can deadlock. Only assign the same
        // primary key: never replace the existing admissions or retry a commit.
        await manager
          .createQueryBuilder()
          .insert()
          .into(PasswordResetLimit)
          .values({ emailDigest, admissions: [] })
          .orUpdate(['emailDigest'])
          .execute();
        const limit = await manager.findOneOrFail(PasswordResetLimit, {
          where: { emailDigest },
          lock: { mode: 'pessimistic_write' },
        });
        const admissions = admitEmail(limit.admissions, Date.now());
        if (!admissions) return null;
        await manager.update(
          PasswordResetLimit,
          { emailDigest },
          { admissions },
        );
        if (!hint) return null;
        const user = await manager.findOne(Usuario, {
          where: { id: hint.id, email: normalized },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user?.ativo) return null;
        const now = new Date(Date.now());
        await revokePending(manager, user.id, now);
        const token = randomBytes(32).toString('base64url');
        const row = await manager.save(
          PasswordReset,
          manager.create(PasswordReset, {
            usuarioId: user.id,
            digest: digestToken(token),
            issuedAt: now,
            expiresAt: new Date(now.getTime() + 300000),
            consumedAt: null,
            revokedAt: null,
            credenciaisVersao: user.credenciaisVersao,
          }),
        );
        await this.deliveries.enqueue(manager, row, user.email, token);
      });
    } catch {
      this.logger.error('password_reset_persistence_unavailable');
      throw new ServiceUnavailableException(
        'Recuperação temporariamente indisponível',
      );
    }
    return { message: RESET_MESSAGE };
  }

  async confirm(dto: RedefinirSenhaDto): Promise<{ message: string }> {
    if (
      dto.novaSenha !== dto.confirmarSenha ||
      !PASSWORD_PATTERN.test(dto.novaSenha)
    ) {
      throw new BadRequestException('Senha inválida ou confirmação diferente');
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(dto.token))
      throw new BadRequestException(INVALID_RESET);
    const digest = digestToken(dto.token);
    try {
      const hint = await this.db
        .getRepository(PasswordReset)
        .findOneBy({ digest });
      if (
        !hint ||
        hint.consumedAt ||
        hint.revokedAt ||
        Date.now() >= hint.expiresAt.getTime()
      ) {
        throw new BadRequestException(INVALID_RESET);
      }
      // Reject known-invalid links before expensive work. This unlocked hint is
      // not authorization: revalidate current state AFTER hashing and locking.
      const hashed = await bcrypt.hash(dto.novaSenha, 10);
      await this.db.transaction(async (manager) => {
        const user = await manager.findOne(Usuario, {
          where: { id: hint.usuarioId },
          lock: { mode: 'pessimistic_write' },
        });
        const row = await manager.findOne(PasswordReset, {
          where: { digest },
          lock: { mode: 'pessimistic_write' },
        });
        const now = new Date(Date.now());
        if (
          !user?.ativo ||
          !row ||
          row.consumedAt ||
          row.revokedAt ||
          now >= row.expiresAt ||
          row.credenciaisVersao !== user.credenciaisVersao
        ) {
          throw new BadRequestException(INVALID_RESET);
        }
        await manager.update(PasswordReset, row.id, { consumedAt: now });
        await manager.update(Usuario, user.id, {
          senha: hashed,
          credenciaisVersao: user.credenciaisVersao + 1,
        });
        await revokePending(manager, user.id, now);
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('password_reset_confirmation_unavailable');
      throw new ServiceUnavailableException(
        'Redefinição temporariamente indisponível',
      );
    }
    // No external audit dependency may turn a committed reset into a public failure.
    this.logger.log('password_reset_completed');
    return {
      message: 'Senha redefinida com sucesso. Entre com sua nova senha.',
    };
  }
}
