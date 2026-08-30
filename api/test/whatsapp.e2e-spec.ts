import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WhatsappController } from '../src/modules/whatsapp/whatsapp.controller';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('WhatsappController (e2e)', () => {
  let app: INestApplication;
  let whatsappService: jest.Mocked<WhatsappService>;

  const mockUser = {
    sub: 1,
    role: 'USER',
  };

  beforeEach(async () => {
    const mockWhatsappService = {
      listarInbound: jest.fn(),
      verifyWebhook: jest.fn(),
      processWebhookPayload: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        { provide: WhatsappService, useValue: mockWhatsappService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { get: jest.fn(), getAllAndOverride: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use((req, _res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    whatsappService = moduleFixture.get(
      WhatsappService,
    ) as jest.Mocked<WhatsappService>;
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve listar inbox inbound do usuario autenticado', async () => {
    whatsappService.listarInbound.mockResolvedValue([{ id: 1 }] as any);

    const response = await request(app.getHttpServer())
      .get('/whatsapp/inbound?limit=10')
      .set('Authorization', 'Bearer fake')
      .expect(200);

    expect(response.body).toEqual([{ id: 1 }]);
    expect(whatsappService.listarInbound).toHaveBeenCalledWith(1, {
      limit: '10',
    });
  });

  it('deve validar webhook GET publicamente', async () => {
    whatsappService.verifyWebhook.mockResolvedValue('challenge-token');

    const response = await request(app.getHttpServer())
      .get(
        '/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=challenge-token',
      )
      .expect(200);

    expect(response.text).toBe('challenge-token');
    expect(whatsappService.verifyWebhook).toHaveBeenCalledWith(
      'subscribe',
      'abc',
      'challenge-token',
    );
  });

  it('deve processar webhook POST publicamente', async () => {
    whatsappService.processWebhookPayload.mockResolvedValue(undefined);
    const payload = { object: 'whatsapp_business_account', entry: [] };

    await request(app.getHttpServer())
      .post('/whatsapp/webhook')
      .set('x-hub-signature-256', 'sha256=assinatura')
      .send(payload)
      .expect(200);

    const call = whatsappService.processWebhookPayload.mock.calls[0];
    expect(call[0]).toEqual(payload);
    expect(call[1]).toBe('sha256=assinatura');
    expect(call[2]).toBeInstanceOf(Buffer);
    expect(JSON.parse(call[2]!.toString('utf8'))).toEqual(payload);
  });
});
