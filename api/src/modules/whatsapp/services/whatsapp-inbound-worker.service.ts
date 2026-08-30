import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { WhatsappJobStatus } from '../whatsapp.types';
import { WhatsappService } from '../whatsapp.service';
import { WhatsappJobQueueService } from './whatsapp-job-queue.service';

@Injectable()
export class WhatsappInboundWorkerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(WhatsappInboundWorkerService.name);
  private readonly workerId = randomUUID();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private shutdownResolver: (() => void) | null = null;

  constructor(
    private readonly queue: WhatsappJobQueueService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.configService.get('WHATSAPP_WORKER_ENABLED') === 'false') {
      return;
    }
    const intervalMs = this.positiveInteger(
      this.configService.get('WHATSAPP_WORKER_POLL_INTERVAL_MS'),
      1000,
    );
    this.timer = setInterval(() => void this.processNext(), intervalMs);
    this.timer.unref();
    void this.processNext();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.running) {
      await new Promise<void>((resolve) => {
        this.shutdownResolver = resolve;
      });
    }
  }

  async processNext(): Promise<boolean> {
    if (this.running) {
      return false;
    }
    this.running = true;
    try {
      const leaseSeconds = this.positiveInteger(
        this.configService.get('WHATSAPP_WORKER_LEASE_SECONDS'),
        300,
      );
      const job = await this.queue.claimNext(this.workerId, leaseSeconds);
      if (!job) {
        return false;
      }
      const heartbeat = setInterval(
        () => {
          void this.queue
            .renewLease(job, leaseSeconds)
            .then((renewed) => {
              if (!renewed) {
                this.logger.warn(`Lease perdido para job WhatsApp ${job.id}`);
              }
            })
            .catch(() => {
              this.logger.error(
                `Falha ao renovar lease do job WhatsApp ${job.id}`,
              );
            });
        },
        Math.max(100, Math.floor((leaseSeconds * 1000) / 3)),
      );
      heartbeat.unref();
      try {
        await this.whatsappService.processarMensagemRecebida(job.payload);
        await this.queue.complete(job, WhatsappJobStatus.CONCLUIDO);
      } catch (error) {
        const transient =
          !(error instanceof HttpException) ||
          error instanceof ServiceUnavailableException ||
          error.getStatus() >= 500;
        const sanitizedError = transient
          ? 'Falha transitoria no processamento inbound'
          : error instanceof BadRequestException
            ? error.message.slice(0, 500)
            : 'Falha interna no processamento inbound';
        await this.queue.fail(job, sanitizedError, transient);
      } finally {
        clearInterval(heartbeat);
      }
      return true;
    } finally {
      this.running = false;
      this.shutdownResolver?.();
      this.shutdownResolver = null;
    }
  }

  private positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
