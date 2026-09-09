import { ConfigService } from '@nestjs/config';
import { PasswordResetDeliveryWorker } from './password-reset-delivery.worker';
import { DeliveryStatus } from './password-reset-delivery.entity';

describe('Worker de recuperação (store/transporte simulados)', () => {
  const setup = () => {
    const lease = { id: 'id', recuperacaoId: 1, owner: 'owner', version: 1 };
    const store = {
      assertConfigured: jest.fn(),
      report: jest.fn(),
      claim: jest.fn().mockResolvedValue(lease),
      prepare: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        token: 't',
        expiresAt: new Date(Date.now() + 300000),
        deadline: new Date(Date.now() + 5000),
      }),
      finish: jest.fn().mockResolvedValue(true),
      retry: jest.fn(),
      renew: jest.fn().mockResolvedValue(true),
      maintain: jest.fn(),
    };
    const mail = {
      assertConfigured: jest.fn(),
      sendReset: jest
        .fn<Promise<void>, [string, string, AbortSignal?, Date?]>()
        .mockResolvedValue(undefined),
    };
    const worker = new PasswordResetDeliveryWorker(
      store as any,
      mail as any,
      new ConfigService(),
    );
    return { store, mail, worker, lease };
  };
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('não sobrepõe ciclos; 204 seguido de falha BD repete só finalização', async () => {
    const { store, mail, worker } = setup();
    let release!: () => void;
    mail.sendReset.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    store.finish.mockRejectedValueOnce(new Error('DB'));
    const processing = worker.tick();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    await worker.tick();
    expect(store.claim).toHaveBeenCalledTimes(1);
    release();
    await processing;
    expect(mail.sendReset).toHaveBeenCalledTimes(1);
    expect(store.finish).toHaveBeenCalledTimes(2);
    expect(store.finish.mock.calls[1][1]).toBe(DeliveryStatus.ACCEPTED);
  });
  it('resultado incerto não retorna à preparação e não repete rede', async () => {
    const { worker, mail, store } = setup();
    mail.sendReset.mockRejectedValue(new Error('SECRET'));
    await worker.tick();
    expect(store.finish).toHaveBeenCalledWith(
      expect.anything(),
      DeliveryStatus.UNKNOWN,
    );
    expect(store.retry).not.toHaveBeenCalled();
    expect(mail.sendReset).toHaveBeenCalledTimes(1);
  });
  it('perda de posse/validação não chama rede', async () => {
    const { worker, mail, store } = setup();
    store.prepare.mockResolvedValue(null);
    await worker.tick();
    expect(mail.sendReset).not.toHaveBeenCalled();
  });
  it('falha preparatória tenta apenas retry persistente', async () => {
    const { worker, mail, store } = setup();
    store.prepare.mockRejectedValue(new Error('DB'));
    await worker.tick();
    expect(mail.sendReset).not.toHaveBeenCalled();
    expect(store.retry).toHaveBeenCalledTimes(1);
  });
  it('janela insuficiente depois do commit impede chamada SDK', async () => {
    const { worker, mail, store } = setup();
    store.prepare.mockResolvedValue({
      email: 'x',
      token: 't',
      expiresAt: new Date(Date.now() + 4999),
      deadline: new Date(Date.now() + 5000),
    });
    await worker.tick();
    expect(mail.sendReset).not.toHaveBeenCalled();
    expect(store.finish).toHaveBeenCalledWith(
      expect.anything(),
      DeliveryStatus.EXPIRED,
    );
  });
  it('modo desabilitado mantém limpeza, sem aquisição', async () => {
    const { store, mail } = setup();
    const worker = new PasswordResetDeliveryWorker(
      store as any,
      mail as any,
      new ConfigService({ PASSWORD_RESET_DELIVERY_ENABLED: 'false' }),
    );
    await worker.tick();
    expect(store.maintain).toHaveBeenCalled();
    expect(store.claim).not.toHaveBeenCalled();
  });
  it('shutdown interrompe aquisição e aborta transporte bloqueado com prazo limitado', async () => {
    jest.useFakeTimers();
    const { worker, mail, store } = setup();
    mail.sendReset.mockImplementation(
      (_email, _token, signal) =>
        new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('abort'))),
        ),
    );
    const work = worker.tick();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const stopping = worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10000);
    await stopping;
    await work;
    expect(mail.sendReset.mock.calls[0][2].aborted).toBe(true);
    await worker.tick();
    expect(store.claim).toHaveBeenCalledTimes(1);
    expect(store.retry).not.toHaveBeenCalled();
  });
  it('shutdown durante aquisição devolve apenas lease preparatória com fencing', async () => {
    const { worker, store, lease, mail } = setup();
    let release!: () => void;
    store.claim.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(lease);
        }),
    );
    const work = worker.tick();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const stop = worker.onModuleDestroy();
    release();
    await work;
    await stop;
    expect(store.retry).toHaveBeenCalledWith(lease);
    expect(mail.sendReset).not.toHaveBeenCalled();
  });
  it('polling de 1s é lifecycle controlado e para no shutdown', async () => {
    jest.useFakeTimers();
    const { worker, store } = setup();
    store.claim.mockResolvedValue(null);
    worker.onModuleInit();
    expect(store.claim).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    expect(store.claim).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(store.claim).toHaveBeenCalledTimes(2);
    await worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5000);
    expect(store.claim).toHaveBeenCalledTimes(2);
  });
});
