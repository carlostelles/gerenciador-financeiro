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
    save: jest.fn(),
    create: jest.fn((payload) => payload),
  };
  const usuarioRepository = {
    findOne: jest.fn(),
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
  };
  const intentParser = {
    parse: jest.fn(),
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
    );

    webhookEventRepository.findOne.mockResolvedValue(null);
    webhookEventRepository.save.mockImplementation(async (payload) => payload);
    inboundMessageRepository.save.mockImplementation(
      async (payload) => payload,
    );
    usuarioRepository.findOne.mockResolvedValue({
      id: 1,
      telefone: '5511999990000',
    });
  });

  it('deve usar mes atual quando texto de extrato nao informa periodo', async () => {
    intentParser.parse.mockReturnValue({
      type: WhatsappIntentType.EXTRATO,
      payload: { textoOriginal: 'extrato' },
    });

    await service.processWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-1',
                    from: '11999990000',
                    timestamp: '1786060800',
                    type: 'text',
                    text: { body: 'quero extrato' },
                  },
                ],
              },
            },
          ],
        },
      ],
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

  it('deve criar movimentacao automaticamente para comprovante em anexo', async () => {
    categoriaRepository.findOne.mockResolvedValue({ id: 10 });
    movimentoRepository.save.mockResolvedValue({ id: 99, periodo: '2026-08' });

    await service.processWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-2',
                    from: '11999990000',
                    timestamp: '1722988800',
                    type: 'document',
                    document: {
                      id: 'media-1',
                      mime_type: 'application/pdf',
                      filename: 'comprovante.pdf',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(movimentoRepository.save).toHaveBeenCalled();
    const finalState = inboundMessageRepository.save.mock.calls.at(-1)?.[0];
    expect(finalState.statusProcessamento).toBe(
      WhatsappInboundProcessingStatus.PROCESSADA,
    );
    expect(finalState.movimentoId).toBe(99);
  });

  it('deve ignorar audio como nao suportado', async () => {
    await service.processWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-3',
                    from: '11999990000',
                    timestamp: '1786060800',
                    type: 'audio',
                    audio: { id: 'aud-1', mime_type: 'audio/ogg' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(movimentoRepository.save).not.toHaveBeenCalled();
    const finalState = inboundMessageRepository.save.mock.calls.at(-1)?.[0];
    expect(finalState.statusProcessamento).toBe(
      WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA,
    );
    expect(finalState.erroProcessamento).toContain('Audio');
  });

  it('deve garantir idempotencia e nao reprocessar evento repetido', async () => {
    webhookEventRepository.findOne.mockResolvedValue({ id: 1 });

    await service.processWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
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

    expect(inboundMessageRepository.save).not.toHaveBeenCalled();
    expect(movimentoRepository.save).not.toHaveBeenCalled();
  });

  it('deve validar assinatura do webhook quando WHATSAPP_APP_SECRET esta configurado', async () => {
    const previousSecret = process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_APP_SECRET = 'secret-test';

    try {
      const payload = { entry: [] };
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
      const payload = { entry: [] };
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
});
