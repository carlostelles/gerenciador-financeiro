import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, SendApi, V1SendRequest } from 'hostinger-mail-api-sdk';

export class MailDeliveryError extends Error {
  constructor(readonly outcome: 'rejected' | 'unknown') {
    super('Envio indisponível');
  }
}

@Injectable()
export class HostingerMailService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured(): URL {
    try {
      const origin = new URL(
        this.config.get<string>('PASSWORD_RESET_WEB_ORIGIN') || '',
      );
      if (
        !this.config.get<string>('HOSTINGER_MAIL_API_TOKEN')?.trim() ||
        !this.config.get<string>('HOSTINGER_MAIL_MAILBOX_ID')?.trim() ||
        origin.username ||
        origin.password ||
        origin.search ||
        origin.hash ||
        origin.pathname !== '/' ||
        !['https:', 'http:'].includes(origin.protocol) ||
        (this.config.get('NODE_ENV') === 'production' &&
          origin.protocol !== 'https:')
      )
        throw new Error();
      return origin;
    } catch {
      throw new ServiceUnavailableException(
        'Recuperação temporariamente indisponível',
      );
    }
  }

  async sendReset(
    email: string,
    token: string,
    signal?: AbortSignal,
    deadline?: Date,
  ): Promise<void> {
    const origin = this.assertConfigured();
    const link = new URL('/redefinir-senha', origin);
    link.hash = `token=${token}`;
    const url = link.toString();
    const escapedUrl = url
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
    const payload: Pick<V1SendRequest, 'to' | 'subject' | 'text' | 'html'> = {
      to: [email],
      subject: 'Redefinição de senha — Gerenciador Financeiro',
      text: `O link expira 5 minutos após a solicitação. O tempo de entrega conta nesse prazo.\n${url}\nSe não solicitou, ignore este e-mail.`,
      html: `<p>O link expira 5 minutos após a solicitação. O tempo de entrega conta nesse prazo.</p><p><a href="${escapedUrl}">Redefinir senha</a></p><p>Se não solicitou, ignore este e-mail.</p>`,
    };
    const api = new SendApi(
      new Configuration({
        accessToken: this.config.get<string>('HOSTINGER_MAIL_API_TOKEN'),
      }),
    );
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      const timeout = Math.min(
        5000,
        deadline ? deadline.getTime() - Date.now() : 5000,
      );
      if (signal?.aborted || timeout <= 0)
        throw new MailDeliveryError('unknown');
      const cancelled = new Promise<never>((_, reject) => {
        onAbort = () => {
          abort.abort();
          reject(new MailDeliveryError('unknown'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(onAbort, timeout);
      });
      // 1.19.1 marks optional fields required in TS; bundled docs/V1SendRequest.md
      // and serializer confirm they may be omitted. Never invent reply/forward/from.
      const response = await Promise.race([
        api.sendEmail(
          this.config.getOrThrow<string>('HOSTINGER_MAIL_MAILBOX_ID'),
          payload as V1SendRequest,
          {
            timeout,
            signal: abort.signal,
            maxRedirects: 0,
          },
        ),
        cancelled,
      ]);
      if (response.status !== 204)
        throw new MailDeliveryError(
          [401, 403, 422].includes(response.status) ? 'rejected' : 'unknown',
        );
    } catch (error) {
      // Axios errors contain request bodies and Authorization. Do not propagate them.
      if (error instanceof MailDeliveryError) throw error;
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      throw new MailDeliveryError(
        [401, 403, 422].includes(status) ? 'rejected' : 'unknown',
      );
    } finally {
      if (timer) clearTimeout(timer);
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  }
}
