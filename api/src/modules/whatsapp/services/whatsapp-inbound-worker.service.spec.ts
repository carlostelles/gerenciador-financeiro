import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappJobStatus } from '../whatsapp.types';
import { WhatsappInboundWorkerService } from './whatsapp-inbound-worker.service';

describe('WhatsappInboundWorkerService', () => {
  const queue = {
    claimNext: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    renewLease: jest.fn(),
  };
  const whatsappService = { processarMensagemRecebida: jest.fn() };
  let worker: WhatsappInboundWorkerService;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new WhatsappInboundWorkerService(
      queue as any,
      whatsappService as any,
      new ConfigService({ WHATSAPP_WORKER_ENABLED: 'false' }),
    );
  });

  it('processa e conclui um job reclamado', async () => {
    const job = {
      id: 1,
      payload: { id: 'wamid-1' },
      tentativas: 1,
      maxTentativas: 5,
    };
    queue.claimNext.mockResolvedValue(job);

    await worker.processNext();

    expect(whatsappService.processarMensagemRecebida).toHaveBeenCalledWith(
      job.payload,
    );
    expect(queue.complete).toHaveBeenCalledWith(
      job,
      WhatsappJobStatus.CONCLUIDO,
    );
  });

  it('agenda retry para falha transitoria sem persistir mensagem externa', async () => {
    const job = {
      id: 2,
      payload: { id: 'wamid-2' },
      tentativas: 1,
      maxTentativas: 5,
    };
    queue.claimNext.mockResolvedValue(job);
    whatsappService.processarMensagemRecebida.mockRejectedValue(
      new ServiceUnavailableException('resposta externa com segredo'),
    );

    await worker.processNext();

    expect(queue.fail).toHaveBeenCalledWith(
      job,
      'Falha transitoria no processamento inbound',
      true,
    );
  });

  it('encerra erro de validacao sem retry', async () => {
    const job = { id: 3, payload: {}, tentativas: 1, maxTentativas: 5 };
    queue.claimNext.mockResolvedValue(job);
    whatsappService.processarMensagemRecebida.mockRejectedValue(
      new BadRequestException('MIME da midia nao permitido'),
    );

    await worker.processNext();

    expect(queue.fail).toHaveBeenCalledWith(
      job,
      'MIME da midia nao permitido',
      false,
    );
  });

  it('agenda retry para falha nao tipada de S3 ou banco', async () => {
    const job = {
      id: 4,
      payload: { id: 'wamid-4' },
      tentativas: 1,
      maxTentativas: 5,
    };
    queue.claimNext.mockResolvedValue(job);
    whatsappService.processarMensagemRecebida.mockRejectedValue(
      new Error('detalhe interno do driver'),
    );

    await worker.processNext();

    expect(queue.fail).toHaveBeenCalledWith(
      job,
      'Falha transitoria no processamento inbound',
      true,
    );
  });
});
