import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WhatsappService } from './whatsapp.service';
import {
  WhatsappInboundProcessingStatus,
  WhatsappIntentType,
} from './whatsapp.types';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const webhookEventRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((payload) => payload),
  };
  const inboundMessageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((payload) => payload),
  };
  const usuarioRepository = {
    find: jest.fn(),
  };
  const movimentoRepository = {
    save: jest.fn(),
    create: jest.fn((payload) => payload),
  };
  const categoriaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const movimentacoesService = {
    create: jest.fn(),
    analisarArquivoAutomaticamente: jest.fn(),
  };
  const intentParser = {
    parse: jest.fn(),
  };
  const jobQueue = { enqueue: jest.fn() };
  const metaClient = {
    downloadMedia: jest.fn(),
    validateWebhookPhoneNumberId: jest.fn(),
  };
  const inboundResultRepository = {
    findOne: jest.fn(),
    create: jest.fn((payload) => payload),
    save: jest.fn(),
  };
  const checkpointRepository = {
    findOne: jest.fn(),
    create: jest.fn((payload) => payload),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new WhatsappService(
      webhookEventRepository as any,
      inboundMessageRepository as any,
      usuarioRepository as any,
      movimentoRepository as any,
      categoriaRepository as any,
      movimentacoesService as any,
      intentParser as any,
      jobQueue as any,
      metaClient as any,
      inboundResultRepository as any,
      checkpointRepository as any,
    );

    webhookEventRepository.findOne.mockResolvedValue(null);
    webhookEventRepository.save.mockImplementation(async (payload) => payload);
    inboundMessageRepository.save.mockImplementation(
      async (payload) => payload,
    );
    inboundMessageRepository.findOne.mockResolvedValue(null);
    jobQueue.enqueue.mockResolvedValue(true);
    usuarioRepository.find.mockResolvedValue([
      {
        id: 1,
        telefone: '5511999990000',
      },
    ]);
    checkpointRepository.findOne.mockResolvedValue(null);
    checkpointRepository.save.mockImplementation(async (payload) => payload);
    inboundResultRepository.findOne.mockResolvedValue(null);
  });

  it('deve usar mes atual quando texto de extrato nao informa periodo', async () => {
    intentParser.parse.mockReturnValue({
      type: WhatsappIntentType.EXTRATO,
      payload: { textoOriginal: 'extrato' },
    });

    await service.processarMensagemRecebida({
      id: 'wamid-1',
      from: '11999990000',
      timestamp: '1786060800',
      type: 'text',
      text: { body: 'quero extrato' },
    });

    const savedItems = inboundMessageRepository.save.mock.calls.map(
      (call) => call[0],
    );
    const finalState = savedItems[savedItems.length - 1];
    const now = new Date();
    const periodoAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    expect(finalState.statusProcessamento).toBe(
      WhatsappInboundProcessingStatus.PROCESSADA,
    );
    expect(finalState.periodoReferencia).toBe(periodoAtual);
    expect(finalState.detalhesProcessamento?.acao).toBe(
      'solicitacao_extrato_registrada',
    );
  });

  it('deve criar movimentacao por texto com chave idempotente por wamid', async () => {
    intentParser.parse.mockReturnValue({
      type: WhatsappIntentType.NOVA_MOVIMENTACAO,
      payload: {
        valor: 23.9,
        data: '2026-08-29',
        categoriaNome: 'Mercado',
        descricao: 'Compra',
      },
    });
    categoriaRepository.find.mockResolvedValue([{ id: 7, nome: 'Mercado' }]);
    movimentacoesService.create.mockResolvedValue({
      id: 99,
      periodo: '2026-08',
    });

    await service.processarMensagemRecebida({
      id: 'wamid-texto-1',
      from: '11999990000',
      type: 'text',
      text: { body: 'gastei 23,90 no mercado' },
    });

    expect(movimentacoesService.create).toHaveBeenCalledWith(
      '2026-08',
      expect.objectContaining({ valor: 23.9, categoriaId: 7 }),
      1,
      'whatsapp:wamid-texto-1:texto:0',
    );
  });

  it('deve criar movimentacao automaticamente para comprovante em anexo', async () => {
    metaClient.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      size: 3,
      sha256: 'hash',
    });
    movimentacoesService.analisarArquivoAutomaticamente.mockResolvedValue({
      tipoDocumento: 'comprovante',
      resultados: [
        {
          comprovanteId: 20,
          sugestao: { periodo: '2026-08' },
          camposObrigatoriosFaltantes: [],
          salvamento: { status: 'criado', movimentoId: 99 },
        },
      ],
    });

    await service.processarMensagemRecebida({
      id: 'wamid-2',
      from: '11999990000',
      timestamp: '1722988800',
      type: 'document',
      phoneNumberId: 'phone-1',
      document: {
        id: 'media-1',
        mime_type: 'application/pdf',
        filename: 'comprovante.pdf',
      },
    });

    expect(metaClient.downloadMedia).toHaveBeenCalledWith('media-1', 'phone-1');
    expect(
      movimentacoesService.analisarArquivoAutomaticamente,
    ).toHaveBeenCalled();
    const finalState = inboundMessageRepository.save.mock.calls.at(-1)?.[0];
    expect(finalState.statusProcessamento).toBe(
      WhatsappInboundProcessingStatus.PROCESSADA,
    );
    expect(finalState.movimentoId).toBe(99);
  });

  it('deve retomar upload e analise persistidos depois de crashes', async () => {
    const checkpoints = new Map<string, any>();
    inboundMessageRepository.save.mockImplementation(async (payload) => ({
      id: payload.id || 41,
      ...payload,
    }));
    checkpointRepository.findOne.mockImplementation(async ({ where }) =>
      checkpoints.get(
        `${where.providerMessageId}:${where.etapa}:${where.ordinal}`,
      ),
    );
    checkpointRepository.save.mockImplementation(async (checkpoint) => {
      checkpoints.set(
        `${checkpoint.providerMessageId}:${checkpoint.etapa}:${checkpoint.ordinal}`,
        checkpoint,
      );
      return checkpoint;
    });
    metaClient.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      size: 3,
      sha256: 'hash-estavel',
    });

    const upload = {
      bucket: 'bucket',
      key: 'movimentacoes/1/whatsapp/hash.pdf',
      caminhoArquivo: 's3://bucket/movimentacoes/1/whatsapp/hash.pdf',
    };
    const analise = {
      tipoDocumento: 'comprovante',
      data: '2026-08-20',
      periodo: '2026-08',
      valor: 10,
      descricao: 'PIX',
      categoriaId: 7,
      contaId: null,
      lancamentos: [],
    };

    movimentacoesService.analisarArquivoAutomaticamente
      .mockImplementationOnce(
        async (_arquivo, _usuarioId, _legenda, opcoes) => {
          await opcoes.onUploadConcluido(upload);
          throw new Error('crash apos upload');
        },
      )
      .mockImplementationOnce(
        async (_arquivo, _usuarioId, _legenda, opcoes) => {
          expect(opcoes.preparado.upload).toEqual(upload);
          await opcoes.onAnaliseConcluida(analise);
          throw new Error('crash apos analise');
        },
      )
      .mockImplementationOnce(
        async (_arquivo, _usuarioId, _legenda, opcoes) => {
          expect(opcoes.preparado).toEqual({ upload, analise });
          return {
            tipoDocumento: 'comprovante',
            resultados: [
              {
                comprovanteId: 20,
                sugestao: { periodo: '2026-08' },
                camposObrigatoriosFaltantes: [],
                salvamento: { status: 'criado', movimentoId: 99 },
              },
            ],
          };
        },
      );

    const mensagem = {
      id: 'wamid-crash',
      from: '11999990000',
      type: 'document',
      phoneNumberId: 'phone-1',
      document: {
        id: 'media-1',
        mime_type: 'application/pdf',
        filename: 'comprovante.pdf',
      },
    };

    await expect(service.processarMensagemRecebida(mensagem)).rejects.toThrow(
      'crash apos upload',
    );
    await expect(service.processarMensagemRecebida(mensagem)).rejects.toThrow(
      'crash apos analise',
    );
    await expect(
      service.processarMensagemRecebida(mensagem),
    ).resolves.toBeUndefined();

    expect(
      movimentacoesService.analisarArquivoAutomaticamente,
    ).toHaveBeenLastCalledWith(
      expect.anything(),
      1,
      '',
      expect.objectContaining({
        idempotencyKeyPrefix: 'whatsapp:wamid-crash',
        storageIdempotencyKey: 'whatsapp:wamid-crash:hash-estavel',
        preparado: { upload, analise },
      }),
    );
  });

  it('deve continuar quando outra replica persistir o mesmo checkpoint', async () => {
    inboundMessageRepository.save.mockImplementation(async (payload) => ({
      id: payload.id || 42,
      ...payload,
    }));
    checkpointRepository.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    metaClient.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      size: 3,
      sha256: 'hash-concorrente',
    });
    movimentacoesService.analisarArquivoAutomaticamente.mockImplementation(
      async (_arquivo, _usuarioId, _legenda, opcoes) => {
        await opcoes.onUploadConcluido({
          bucket: 'bucket',
          key: 'movimentacoes/1/idempotente/hash.pdf',
          caminhoArquivo: 's3://bucket/movimentacoes/1/idempotente/hash.pdf',
        });
        return {
          tipoDocumento: 'comprovante',
          resultados: [
            {
              comprovanteId: 20,
              sugestao: { periodo: '2026-08' },
              camposObrigatoriosFaltantes: [],
              salvamento: { status: 'criado', movimentoId: 99 },
            },
          ],
        };
      },
    );

    await expect(
      service.processarMensagemRecebida({
        id: 'wamid-concorrente',
        from: '11999990000',
        type: 'document',
        phoneNumberId: 'phone-1',
        document: {
          id: 'media-1',
          mime_type: 'application/pdf',
          filename: 'comprovante.pdf',
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('deve continuar quando outra replica persistir o mesmo resultado', async () => {
    inboundMessageRepository.save.mockImplementation(async (payload) => ({
      id: payload.id || 43,
      ...payload,
    }));
    inboundResultRepository.save.mockRejectedValueOnce({
      code: 'ER_DUP_ENTRY',
    });
    metaClient.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      size: 3,
      sha256: 'hash-resultado-concorrente',
    });
    movimentacoesService.analisarArquivoAutomaticamente.mockImplementation(
      async (_arquivo, _usuarioId, _legenda, opcoes) => {
        const resultado = {
          comprovanteId: 20,
          sugestao: { periodo: '2026-08' },
          camposObrigatoriosFaltantes: [],
          salvamento: { status: 'criado', movimentoId: 99 },
        };
        await opcoes.onResultadoConcluido(resultado, 0);
        return { tipoDocumento: 'comprovante', resultados: [resultado] };
      },
    );

    await expect(
      service.processarMensagemRecebida({
        id: 'wamid-resultado-concorrente',
        from: '11999990000',
        type: 'document',
        phoneNumberId: 'phone-1',
        document: {
          id: 'media-1',
          mime_type: 'application/pdf',
          filename: 'comprovante.pdf',
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('deve ignorar audio como nao suportado', async () => {
    await service.processarMensagemRecebida({
      id: 'wamid-3',
      from: '11999990000',
      timestamp: '1786060800',
      type: 'audio',
      audio: { id: 'aud-1', mime_type: 'audio/ogg' },
    });

    expect(movimentoRepository.save).not.toHaveBeenCalled();
    const finalState = inboundMessageRepository.save.mock.calls.at(-1)?.[0];
    expect(finalState.statusProcessamento).toBe(
      WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA,
    );
    expect(finalState.erroProcessamento).toContain('Audio');
  });

  it('deve garantir idempotencia e nao reprocessar evento repetido', async () => {
    await service.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'phone-1' },
                messages: [
                  {
                    id: 'wamid-repeat',
                    from: '11999990000',
                    timestamp: '1786060800',
                    type: 'text',
                    text: { body: 'extrato' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(jobQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(inboundMessageRepository.save).not.toHaveBeenCalled();
    expect(movimentoRepository.save).not.toHaveBeenCalled();
  });

  it('rejeita mensagem de phone_number_id diferente antes de enfileirar', async () => {
    metaClient.validateWebhookPhoneNumberId.mockImplementationOnce(() => {
      throw new BadRequestException('phone_number_id invalido');
    });

    await expect(
      service.processWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'outro-phone' },
                  messages: [
                    {
                      id: 'wamid-spoofed',
                      from: '5511999990000',
                      type: 'text',
                      text: { body: 'extrato' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(jobQueue.enqueue).not.toHaveBeenCalled();
  });

  it('deve validar assinatura do webhook quando WHATSAPP_APP_SECRET esta configurado', async () => {
    const previousSecret = process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_APP_SECRET = 'secret-test';

    try {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = `sha256=${createHmac('sha256', 'secret-test').update(rawBody).digest('hex')}`;

      await expect(
        service.processWebhookPayload(payload, signature, rawBody),
      ).resolves.toBeUndefined();
    } finally {
      if (previousSecret === undefined) {
        delete process.env.WHATSAPP_APP_SECRET;
      } else {
        process.env.WHATSAPP_APP_SECRET = previousSecret;
      }
    }
  });

  it('deve rejeitar webhook com assinatura invalida', async () => {
    const previousSecret = process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_APP_SECRET = 'secret-test';

    try {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const rawBody = Buffer.from(JSON.stringify(payload));

      await expect(
        service.processWebhookPayload(payload, 'sha256=invalid', rawBody),
      ).rejects.toThrow(BadRequestException);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.WHATSAPP_APP_SECRET;
      } else {
        process.env.WHATSAPP_APP_SECRET = previousSecret;
      }
    }
  });

  it('persiste job sem baixar midia durante o webhook', async () => {
    await service.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'phone-1' },
                messages: [
                  {
                    id: 'wamid-fast',
                    from: '5511999990000',
                    type: 'image',
                    image: { id: 'media-1', mime_type: 'image/jpeg' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(jobQueue.enqueue).toHaveBeenCalledWith(
      'wamid-fast',
      expect.objectContaining({ phoneNumberId: 'phone-1' }),
    );
    expect(metaClient.downloadMedia).not.toHaveBeenCalled();
    expect(inboundMessageRepository.save).not.toHaveBeenCalled();
  });

  it('status outbound nao cria job nem movimentacao', async () => {
    await service.processWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: 'out-1', status: 'delivered' }] } },
          ],
        },
      ],
    });

    expect(jobQueue.enqueue).not.toHaveBeenCalled();
    expect(movimentacoesService.create).not.toHaveBeenCalled();
    expect(
      movimentacoesService.analisarArquivoAutomaticamente,
    ).not.toHaveBeenCalled();
  });

  it('rejeita usuario inativo no lookup e nao processa financeiro', async () => {
    usuarioRepository.find.mockResolvedValue([]);

    await service.processarMensagemRecebida({
      id: 'wamid-inativo',
      from: '5511999990000',
      type: 'image',
      phoneNumberId: 'phone-1',
      image: { id: 'media-1', mime_type: 'image/jpeg' },
    });

    expect(usuarioRepository.find.mock.calls[0][0].where.ativo).toBe(true);
    expect(metaClient.downloadMedia).not.toHaveBeenCalled();
    expect(
      inboundMessageRepository.save.mock.calls.at(-1)?.[0].statusProcessamento,
    ).toBe(WhatsappInboundProcessingStatus.FALHA);
  });

  it('consulta telefone recebido e variante brasileira com nono digito', async () => {
    usuarioRepository.find.mockResolvedValue([]);

    await service.processarMensagemRecebida({
      id: 'wamid-phone',
      from: '1187654321',
      type: 'audio',
      audio: { id: 'audio-1', mime_type: 'audio/ogg' },
    });

    const telefoneOperator =
      usuarioRepository.find.mock.calls[0][0].where.telefone;
    expect(telefoneOperator.value).toEqual(
      expect.arrayContaining(['1187654321', '551187654321', '5511987654321']),
    );
  });

  it('falha fechado quando variantes do telefone pertencem a usuarios diferentes', async () => {
    usuarioRepository.find.mockResolvedValue([
      { id: 1, telefone: '11999990000', ativo: true },
      { id: 2, telefone: '5511999990000', ativo: true },
    ]);

    await service.processarMensagemRecebida({
      id: 'wamid-phone-ambiguo',
      from: '5511999990000',
      type: 'image',
      phoneNumberId: 'phone-1',
      image: { id: 'media-1', mime_type: 'image/jpeg' },
    });

    expect(metaClient.downloadMedia).not.toHaveBeenCalled();
    expect(
      inboundMessageRepository.save.mock.calls.at(-1)?.[0].statusProcessamento,
    ).toBe(WhatsappInboundProcessingStatus.FALHA);
  });

  it('persiste varios resultados de extrato vinculados ao mesmo inbound', async () => {
    inboundMessageRepository.save.mockImplementation(async (payload) => ({
      id: payload.id || 42,
      ...payload,
    }));
    metaClient.downloadMedia.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      size: 3,
      sha256: 'hash',
    });
    movimentacoesService.analisarArquivoAutomaticamente.mockResolvedValue({
      tipoDocumento: 'extrato',
      resultados: [
        {
          comprovanteId: 20,
          sugestao: { periodo: '2026-08' },
          camposObrigatoriosFaltantes: [],
          salvamento: { status: 'criado', movimentoId: 100 },
        },
        {
          comprovanteId: 20,
          sugestao: { periodo: '2026-08' },
          camposObrigatoriosFaltantes: ['categoriaId'],
          salvamento: { status: 'criado', movimentoId: 101 },
        },
      ],
    });

    await service.processarMensagemRecebida({
      id: 'wamid-extrato',
      from: '5511999990000',
      type: 'document',
      phoneNumberId: 'phone-1',
      document: {
        id: 'media-extrato',
        mime_type: 'application/pdf',
        filename: 'extrato.pdf',
      },
    });

    const resultados = inboundResultRepository.save.mock.calls.map(
      (call) => call[0],
    );
    expect(resultados).toHaveLength(2);
    expect(resultados).toEqual([
      expect.objectContaining({
        inboundMessageId: 42,
        comprovanteId: 20,
        ordinal: 0,
      }),
      expect.objectContaining({
        inboundMessageId: 42,
        comprovanteId: 20,
        ordinal: 1,
      }),
    ]);
  });
});
