import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WhatsappInboundJob } from '../entities/whatsapp-inbound-job.entity';
import { WhatsappJobStatus } from '../whatsapp.types';

@Injectable()
export class WhatsappJobQueueService {
  constructor(
    @InjectRepository(WhatsappInboundJob)
    private readonly repository: Repository<WhatsappInboundJob>,
    private readonly dataSource: DataSource,
  ) {}

  async enqueue(
    providerMessageId: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      await this.repository.save(
        this.repository.create({
          providerMessageId,
          payload,
          status: WhatsappJobStatus.PENDENTE,
          tentativas: 0,
          maxTentativas: 5,
          proximaTentativaEm: null,
          leaseAte: null,
          leasedBy: null,
          ultimoErro: null,
        }),
      );
      return true;
    } catch (error: any) {
      if (
        error?.code === 'ER_DUP_ENTRY' ||
        String(error?.message).includes('Duplicate entry')
      ) {
        return false;
      }
      throw error;
    }
  }

  async claimNext(
    workerId: string,
    leaseSeconds: number,
  ): Promise<WhatsappInboundJob | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        UPDATE whatsapp_inbound_jobs
        SET status = 'AGUARDANDO_RETRY', leaseAte = NULL, leasedBy = NULL
        WHERE status = 'PROCESSANDO' AND leaseAte < UTC_TIMESTAMP()
      `);
      const rows = await queryRunner.query(`
        SELECT * FROM whatsapp_inbound_jobs
        WHERE status IN ('PENDENTE', 'AGUARDANDO_RETRY')
          AND (proximaTentativaEm IS NULL OR proximaTentativaEm <= UTC_TIMESTAMP())
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);
      if (!rows.length) {
        await queryRunner.commitTransaction();
        return null;
      }

      const row = rows[0];
      await queryRunner.query(
        `UPDATE whatsapp_inbound_jobs
         SET status = 'PROCESSANDO', tentativas = tentativas + 1,
             leasedBy = ?, leaseAte = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
         WHERE id = ?`,
        [workerId, leaseSeconds, row.id],
      );
      await queryRunner.commitTransaction();
      return {
        ...row,
        payload:
          typeof row.payload === 'string'
            ? JSON.parse(row.payload)
            : row.payload,
        status: WhatsappJobStatus.PROCESSANDO,
        tentativas: Number(row.tentativas) + 1,
        leasedBy: workerId,
      } as WhatsappInboundJob;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async complete(
    job: WhatsappInboundJob,
    status = WhatsappJobStatus.CONCLUIDO,
  ): Promise<boolean> {
    const result = await this.repository.update(
      {
        id: job.id,
        status: WhatsappJobStatus.PROCESSANDO,
        leasedBy: job.leasedBy,
      },
      {
        status,
        leaseAte: null,
        leasedBy: null,
        proximaTentativaEm: null,
        ultimoErro: null,
      },
    );
    return result.affected === 1;
  }

  async renewLease(
    job: WhatsappInboundJob,
    leaseSeconds: number,
  ): Promise<boolean> {
    const seconds = Math.max(1, Math.floor(leaseSeconds));
    const result = await this.dataSource.query(
      `UPDATE whatsapp_inbound_jobs
       SET leaseAte = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
       WHERE id = ? AND status = 'PROCESSANDO' AND leasedBy = ?`,
      [seconds, job.id, job.leasedBy],
    );
    return result?.affectedRows === 1;
  }

  async fail(
    job: WhatsappInboundJob,
    sanitizedError: string,
    transient: boolean,
  ): Promise<boolean> {
    const retry = transient && job.tentativas < job.maxTentativas;
    const backoffSeconds = Math.min(
      15 * 2 ** Math.max(job.tentativas - 1, 0),
      3600,
    );
    const result = await this.repository.update(
      {
        id: job.id,
        status: WhatsappJobStatus.PROCESSANDO,
        leasedBy: job.leasedBy,
      },
      {
        status: retry
          ? WhatsappJobStatus.AGUARDANDO_RETRY
          : WhatsappJobStatus.FALHA,
        proximaTentativaEm: retry
          ? new Date(Date.now() + backoffSeconds * 1000)
          : null,
        leaseAte: null,
        leasedBy: null,
        ultimoErro: sanitizedError.slice(0, 500),
      },
    );
    return result.affected === 1;
  }
}
