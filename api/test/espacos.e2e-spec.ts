import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { EspacosController } from '../src/modules/espacos/espacos.controller';
import { EspacosService } from '../src/modules/espacos/espacos.service';
import { EspacoTipo } from '../src/modules/espacos/entities/espaco.entity';

describe('EspacosController (e2e)', () => {
  let app: INestApplication;
  let service: Record<string, jest.Mock>;

  beforeAll(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      resolveContext: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      listMembers: jest.fn(),
      addMember: jest.fn(),
      updateMember: jest.fn(),
      removeMember: jest.fn(),
      leave: jest.fn(),
      transferOwnership: jest.fn(),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EspacosController],
      providers: [{ provide: EspacosService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req, _res, next) => {
      req.user = { sub: 1, email: 'owner@example.com' };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => jest.clearAllMocks());

  it('normaliza o nome e cria espaço SHARED', async () => {
    service.create.mockResolvedValue({
      id: 7,
      nome: 'Família',
      tipo: EspacoTipo.SHARED,
      ownerUsuarioId: 1,
    });

    await request(app.getHttpServer())
      .post('/espacos')
      .send({ nome: '  Família  ' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.tipo).toBe(EspacoTipo.SHARED);
      });

    expect(service.create).toHaveBeenCalledWith({ nome: 'Família' }, 1);
  });

  it('rejeita nome vazio após trim', () =>
    request(app.getHttpServer())
      .post('/espacos')
      .send({ nome: '   ' })
      .expect(400));

  it('rejeita espacoId inválido no contexto', () =>
    request(app.getHttpServer())
      .get('/espacos/contexto?espacoId=invalido')
      .expect(400));

  it('retorna 409 para nome repetido do mesmo owner', () => {
    service.create.mockRejectedValue(
      new ConflictException('Já existe um espaço com este nome para o proprietário'),
    );

    return request(app.getHttpServer())
      .post('/espacos')
      .send({ nome: 'Família' })
      .expect(409);
  });

  it('preserva 404 para espaço fora do vínculo do usuário', () => {
    service.findOne.mockRejectedValue(new NotFoundException('Espaço não encontrado'));

    return request(app.getHttpServer()).get('/espacos/99').expect(404);
  });

  it('preserva 403 para papel insuficiente em espaço conhecido', () => {
    service.update.mockRejectedValue(
      new ForbiddenException('Papel insuficiente neste espaço'),
    );

    return request(app.getHttpServer())
      .patch('/espacos/7')
      .send({ nome: 'Novo nome' })
      .expect(403);
  });
});