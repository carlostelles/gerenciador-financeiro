import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { PasswordResetController } from '../src/modules/auth/password-reset/password-reset.controller';
import { PasswordResetService } from '../src/modules/auth/password-reset/password-reset.service';
import { configureHttpSecurity } from '../src/config/http-security';
import { RESET_MESSAGE } from '../src/modules/auth/password-reset/password-reset.rules';

describe('Recuperação HTTP com validação/rate limit reais, serviço mock', () => {
  let app: NestExpressApplication;
  const reset = { request: jest.fn(), confirm: jest.fn() };
  const confirm = { token: 'a'.repeat(43), novaSenha: 'abcdefgh', confirmarSenha: 'abcdefgh' };
  beforeEach(async () => {
    reset.request.mockReset().mockResolvedValue({ message: RESET_MESSAGE });
    reset.confirm.mockReset().mockResolvedValue({ message: 'Senha redefinida com sucesso. Entre com sua nova senha.' });
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [PasswordResetController],
      providers: [{ provide: PasswordResetService, useValue: reset }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureHttpSecurity(app, '');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterEach(async () => { await app.close(); });

  it('202 neutro sem JWT e 200 sem autenticação automática', async () => {
    const res = await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').send({ email: 'user@example.com' }).expect(202);
    expect(res.body).toEqual({ message: RESET_MESSAGE });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    const result = await request(app.getHttpServer()).post('/auth/redefinir-senha').send(confirm).expect(200);
    expect(result.body).not.toHaveProperty('accessToken'); expect(result.headers['set-cookie']).toBeUndefined();
  });
  it.each([{ email: 'bad' }, { email: 'a@example.com', token: 'extra' }, {}])('rejeita request inválido %p sem cache', async body => {
    const response = await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').send(body).expect(400);
    expect(response.headers['cache-control']).toBe('no-store'); expect(reset.request).not.toHaveBeenCalled();
  });
  it('limita cada endpoint a 5/min/IP e ignora spoofing X-Forwarded-For direto', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').set('X-Forwarded-For', `192.0.2.${i}`).send({ email: 'a@example.com' }).expect(202);
    }
    const response = await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').set('X-Forwarded-For', '203.0.113.1').send({ email: 'a@example.com' }).expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(response.headers['cache-control']).toBe('no-store');
    for (let i = 0; i < 5; i++) await request(app.getHttpServer()).post('/auth/redefinir-senha').send(confirm).expect(200);
    await request(app.getHttpServer()).post('/auth/redefinir-senha').send(confirm).expect(429);
  });

  it('proxy confiável usa salto mais próximo não confiável, não prefixo forjado', async () => {
    app.set('trust proxy', ['127.0.0.1/32', '::1/128']);
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').set('X-Forwarded-For', `192.0.2.${i}, 203.0.113.9`).send({ email: 'a@example.com' }).expect(202);
    }
    await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').set('X-Forwarded-For', '192.0.2.99, 203.0.113.9').send({ email: 'a@example.com' }).expect(429);
    await request(app.getHttpServer()).post('/auth/solicitar-recuperacao-senha').set('X-Forwarded-For', '203.0.113.10').send({ email: 'a@example.com' }).expect(202);
  });
});