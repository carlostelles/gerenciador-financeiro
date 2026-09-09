import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  SendApi,
  SendApiAxiosParamCreator,
  V1SendRequest,
} from 'hostinger-mail-api-sdk';
import {
  HostingerMailService,
  MailDeliveryError,
} from './hostinger-mail.service';

describe('Hostinger adapter (SDK mock, nenhum envio)', () => {
  const config = (origin = 'https://financeiro.example') =>
    new ConfigService({
      NODE_ENV: 'production',
      HOSTINGER_MAIL_API_TOKEN: 'test-secret',
      HOSTINGER_MAIL_MAILBOX_ID: 'mailbox-test',
      PASSWORD_RESET_WEB_ORIGIN: origin,
    });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('serializer real SDK monta POST/Bearer e preserva fragmento sem from', async () => {
    const payload = {
      to: ['user@example.com'],
      subject: 'Reset',
      text: 'https://financeiro.example/redefinir-senha#token=abc',
      html: '<p>Reset</p>',
    };
    const args = await SendApiAxiosParamCreator(
      new Configuration({ accessToken: 'test-secret' }),
    ).sendEmail('mailbox/test', payload as V1SendRequest);
    expect(args.url).toBe('/api/v1/mailboxes/mailbox%2Ftest/send');
    expect(args.options.method).toBe('POST');
    expect(args.options.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer test-secret' }),
    );
    expect(JSON.parse(args.options.data as string)).toEqual(payload);
  });
  it('substitui erro SDK por erro sem dados', async () => {
    jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockRejectedValue(new Error('RAW TOKEN + API SECRET'));
    await expect(
      new HostingerMailService(config()).sendReset(
        'user@example.com',
        'a'.repeat(43),
      ),
    ).rejects.toThrow(/^Envio indisponível$/);
  });
  it('usa mailbox, payload sem from e timeout/cancelamento; aceita 204', async () => {
    const send = jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockResolvedValue({ status: 204 } as any);
    const mail = new HostingerMailService(config());
    await mail.sendReset('user@example.com', 'a'.repeat(43));
    expect(send).toHaveBeenCalledWith(
      'mailbox-test',
      expect.objectContaining({
        to: expect.anything(),
        subject: expect.any(String),
        text: expect.stringContaining('/redefinir-senha#token='),
        html: expect.any(String),
      }),
      expect.objectContaining({
        timeout: 5000,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(send.mock.calls[0][1]).not.toHaveProperty('from');
    expect(send.mock.calls[0][2]?.maxRedirects).toBe(0);
    expect(send.mock.calls[0][1].text).toContain(
      'O link expira 5 minutos após a solicitação. O tempo de entrega conta nesse prazo.',
    );
  });
  it.each([
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com?x=1',
    'https://example.com#x',
  ])('recusa origem insegura %s', (origin) => {
    expect(() =>
      new HostingerMailService(config(origin)).assertConfigured(),
    ).toThrow();
  });
  it('config incompleta falha antes de envio', () => {
    expect(() =>
      new HostingerMailService(
        new ConfigService({ PASSWORD_RESET_WEB_ORIGIN: 'https://example.com' }),
      ).assertConfigured(),
    ).toThrow('Recuperação temporariamente indisponível');
  });
  it('cancela prazo e nunca propaga dados de erro SDK', async () => {
    jest.useFakeTimers();
    const send = jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockImplementation(() => new Promise(() => {}));
    const promise = new HostingerMailService(config()).sendReset(
      'user@example.com',
      'a'.repeat(43),
    );
    const result = expect(promise).rejects.toThrow('Envio indisponível');
    await jest.advanceTimersByTimeAsync(5000);
    await result;
    expect(send.mock.calls[0][2]?.signal?.aborted).toBe(true);
  });
  it.each([401, 403, 422, 429, 500, 502, 302, 200])(
    'classifica %i sem retry nem dados externos',
    async (status) => {
      const send = jest
        .spyOn(SendApi.prototype, 'sendEmail')
        .mockRejectedValue({
          response: { status },
          config: { token: 'SECRET' },
        });
      const error = await new HostingerMailService(config())
        .sendReset('user@example.com', 'a'.repeat(43))
        .catch((error) => error);
      expect(error).toBeInstanceOf(MailDeliveryError);
      expect(error.outcome).toBe(
        [401, 403, 422].includes(status) ? 'rejected' : 'unknown',
      );
      expect(JSON.stringify(error)).not.toContain('SECRET');
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it('resposta inesperada resolvida não é aceitação', async () => {
    jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockResolvedValue({ status: 200 } as any);
    await expect(
      new HostingerMailService(config()).sendReset(
        'user@example.com',
        'a'.repeat(43),
      ),
    ).rejects.toMatchObject({ outcome: 'unknown' });
  });
  it('abort local cancela transporte sem segunda chamada', async () => {
    const send = jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockImplementation(() => new Promise(() => {}));
    const abort = new AbortController();
    const pending = new HostingerMailService(config()).sendReset(
      'user@example.com',
      'a'.repeat(43),
      abort.signal,
    );
    const result = expect(pending).rejects.toMatchObject({
      outcome: 'unknown',
    });
    abort.abort();
    await result;
    expect(send.mock.calls[0][2]?.signal?.aborted).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('não chama SDK após cancelamento ou deadline', async () => {
    const send = jest
      .spyOn(SendApi.prototype, 'sendEmail')
      .mockImplementation(() => new Promise(() => {}));
    const abort = new AbortController();
    abort.abort();
    await expect(
      new HostingerMailService(config()).sendReset(
        'user@example.com',
        'a'.repeat(43),
        abort.signal,
      ),
    ).rejects.toThrow();
    await expect(
      new HostingerMailService(config()).sendReset(
        'user@example.com',
        'a'.repeat(43),
        undefined,
        new Date(0),
      ),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
