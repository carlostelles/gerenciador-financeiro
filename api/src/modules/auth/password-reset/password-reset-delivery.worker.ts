import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  HostingerMailService,
  MailDeliveryError,
} from './hostinger-mail.service';
import {
  DeliveryLease,
  PasswordResetDeliveryStore,
} from './password-reset-delivery.store';
import { DeliveryStatus as State } from './password-reset-delivery.entity';

@Injectable()
export class PasswordResetDeliveryWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PasswordResetDeliveryWorker.name);
  private readonly owner = randomUUID();
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private abort?: AbortController;
  private failures = 0;
  private lastReport = 0;
  constructor(
    private readonly store: PasswordResetDeliveryStore,
    private readonly mail: HostingerMailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.schedule();
  }
  private schedule(): void {
    if (this.stopped) return;
    this.timer = setTimeout(
      () => {
        void this.tick().finally(() => this.schedule());
      },
      Math.min(30000, 1000 * 2 ** this.failures),
    );
    this.timer.unref();
  }
  async tick(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = this.cycle();
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }
  private async cycle(): Promise<void> {
    try {
      await this.store.maintain();
      if (Date.now() - this.lastReport >= 60000) {
        await this.store.report();
        this.lastReport = Date.now();
      }
      if (
        this.stopped ||
        this.config.get('PASSWORD_RESET_DELIVERY_ENABLED') === 'false'
      )
        return;
      this.mail.assertConfigured();
      this.store.assertConfigured();
      const lease = await this.store.claim(this.owner);
      if (lease) {
        if (this.stopped) await this.store.retry(lease);
        else await this.deliver(lease);
      }
      this.failures = 0;
    } catch {
      if (this.failures === 0)
        this.logger.warn('password_reset_worker_unavailable');
      this.failures = Math.min(5, this.failures + 1);
    }
  }
  private async deliver(lease: DeliveryLease): Promise<void> {
    let lost = false;
    // The renewal transaction only touches a job, never then acquires a user lock.
    let renewing: Promise<void> | undefined;
    const renewal = setInterval(() => {
      if (renewing) return;
      renewing = this.store
        .renew(lease)
        .then(
          (owned) => {
            if (!owned) lost = true;
          },
          () => {
            lost = true;
          },
        )
        .finally(() => {
          renewing = undefined;
        });
    }, 10000);
    renewal.unref();
    let prepared: Awaited<ReturnType<PasswordResetDeliveryStore['prepare']>>;
    try {
      prepared = await this.store.prepare(lease, () => this.stopped || lost);
    } catch {
      await this.store.retry(lease);
      return;
    } finally {
      clearInterval(renewal);
    }
    if (!prepared) {
      if (this.stopped || lost) await this.store.retry(lease);
      return;
    }
    // Network is outside ALL transactions. Never retry prepare after this point.
    let outcome: State.ACCEPTED | State.FAILED | State.UNKNOWN | State.EXPIRED =
      State.UNKNOWN;
    if (this.stopped || lost) outcome = State.UNKNOWN;
    else if (
      prepared.expiresAt.getTime() - Date.now() <= 5000 ||
      prepared.deadline.getTime() <= Date.now()
    )
      outcome = State.EXPIRED;
    else {
      this.abort = new AbortController();
      try {
        await this.mail.sendReset(
          prepared.email,
          prepared.token,
          this.abort.signal,
          prepared.deadline,
        );
        outcome = State.ACCEPTED;
      } catch (error) {
        outcome =
          error instanceof MailDeliveryError && error.outcome === 'rejected'
            ? State.FAILED
            : State.UNKNOWN;
      } finally {
        this.abort = undefined;
      }
    }
    // Retry ONLY this write after 204. If all writes fail, maintenance marks UNKNOWN.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.store.finish(lease, outcome);
        return;
      } catch {
        if (attempt === 2)
          this.logger.warn('password_reset_finalization_unavailable');
      }
    }
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.running,
        new Promise<void>((resolve) => {
          deadline = setTimeout(() => {
            this.abort?.abort();
            resolve();
          }, 10000);
        }),
      ]);
    } finally {
      if (deadline) clearTimeout(deadline);
      this.abort?.abort();
    }
  }
}
