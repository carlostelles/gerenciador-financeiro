import { WhatsappInboundJob } from '../entities/whatsapp-inbound-job.entity';
import { WhatsappJobStatus } from '../whatsapp.types';
import { WhatsappJobQueueService } from './whatsapp-job-queue.service';

describe('WhatsappJobQueueService', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
  };
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(),
  };
  let service: WhatsappJobQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappJobQueueService(repository as any, dataSource as any);
    repository.save.mockImplementation(async (value) => ({ id: 1, ...value }));
    repository.update.mockResolvedValue({ affected: 1 });
  });

  it('enfileira payload sanitizado uma unica vez por wamid', async () => {
    await service.enqueue('wamid-1', { id: 'wamid-1', type: 'image' });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerMessageId: 'wamid-1',
        status: WhatsappJobStatus.PENDENTE,
      }),
    );
  });

  it('trata chave duplicada como idempotencia bem-sucedida', async () => {
    repository.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

    await expect(service.enqueue('wamid-1', {})).resolves.toBe(false);
  });

  it('faz claim atomico com SKIP LOCKED e recupera lease expirado', async () => {
    queryRunner.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 7,
          providerMessageId: 'wamid-7',
          payload: JSON.stringify({ id: 'wamid-7' }),
          status: WhatsappJobStatus.PENDENTE,
          tentativas: 0,
          maxTentativas: 5,
        },
      ])
      .mockResolvedValueOnce([]);

    const job = await service.claimNext('worker-a', 60);

    expect(queryRunner.query.mock.calls[1][0]).toContain(
      'FOR UPDATE SKIP LOCKED',
    );
    expect(queryRunner.query.mock.calls[2][1]).toEqual(['worker-a', 60, 7]);
    expect(job).toEqual(
      expect.objectContaining({
        id: 7,
        tentativas: 1,
        payload: { id: 'wamid-7' },
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('agenda retry exponencial e encerra ao atingir maximo', async () => {
    const job = {
      id: 4,
      tentativas: 2,
      maxTentativas: 5,
      leasedBy: 'worker-a',
    } as WhatsappInboundJob;
    await service.fail(job, 'erro sanitizado', true);

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 4,
        status: WhatsappJobStatus.PROCESSANDO,
        leasedBy: 'worker-a',
      }),
      expect.objectContaining({
        status: WhatsappJobStatus.AGUARDANDO_RETRY,
        ultimoErro: 'erro sanitizado',
        leaseAte: null,
      }),
    );

    repository.update.mockClear();
    await service.fail({ ...job, tentativas: 5 }, 'erro', true);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 4,
        status: WhatsappJobStatus.PROCESSANDO,
        leasedBy: 'worker-a',
      }),
      expect.objectContaining({ status: WhatsappJobStatus.FALHA }),
    );
  });

  it('so conclui o job quando o worker ainda possui o lease', async () => {
    const job = {
      id: 8,
      leasedBy: 'worker-a',
    } as WhatsappInboundJob;
    repository.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.complete(job)).resolves.toBe(false);
    expect(repository.update).toHaveBeenCalledWith(
      {
        id: 8,
        status: WhatsappJobStatus.PROCESSANDO,
        leasedBy: 'worker-a',
      },
      expect.objectContaining({ status: WhatsappJobStatus.CONCLUIDO }),
    );
  });

  it('renova lease apenas para o worker que possui o job', async () => {
    dataSource.query.mockResolvedValue({ affectedRows: 1 });
    const job = { id: 9, leasedBy: 'worker-a' } as WhatsappInboundJob;

    await expect(service.renewLease(job, 60)).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'PROCESSANDO' AND leasedBy = ?"),
      [60, 9, 'worker-a'],
    );
  });
});
