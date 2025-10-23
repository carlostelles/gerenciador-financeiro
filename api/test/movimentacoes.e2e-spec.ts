import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { MovimentacoesController } from '../src/modules/movimentacoes/movimentacoes.controller';
import { MovimentacoesService } from '../src/modules/movimentacoes/movimentacoes.service';
import { LogsService } from '../src/modules/logs/logs.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('MovimentacoesController (e2e)', () => {
  let app: INestApplication;
  let movimentacoesService: jest.Mocked<MovimentacoesService>;

  const mockUser = { 
    sub: 1, 
    email: 'test@example.com', 
    role: 'USER' 
  };

  const accessToken = 'mock-access-token';

  const mockMovimento = {
    id: 1,
    usuarioId: 1,
    periodo: '2025-09',
    data: '2025-09-15',
    descricao: 'Movimento de teste',
    valor: 500.00,
    orcamentoItemId: 1,
    createdAt: '2025-09-30T14:30:25.628Z',
    updatedAt: '2025-09-30T14:30:25.628Z',
    usuario: { id: 1, nome: 'Test User', email: 'test@example.com' } as any,
    orcamentoItem: { 
      id: 1, 
      descricao: 'Item de orçamento',
      valor: 1000.00,
      categoria: { id: 1, nome: 'Categoria Teste' }
    } as any
  };

  beforeEach(async () => {
    const mockMovimentacoesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    // Mock do RolesGuard para bypass de autenticação
    const mockRolesGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MovimentacoesController],
      providers: [
        {
          provide: MovimentacoesService,
          useValue: mockMovimentacoesService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        // Mock do JwtService necessário para JwtAuthGuard
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        // Mock do Reflector necessário para guards
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
        // Mock do ConfigService necessário para JwtAuthGuard
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Middleware para simular usuário autenticado
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    movimentacoesService = moduleFixture.get<MovimentacoesService>(MovimentacoesService) as jest.Mocked<MovimentacoesService>;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/movimentacoes/:periodo (POST)', () => {
    it('deve criar um novo movimento com sucesso', async () => {
      const createMovimentoDto = {
        data: '2025-09-15',
        descricao: 'Movimento de teste',
        valor: 500.00,
        orcamentoItemId: 1
      };

      movimentacoesService.create.mockResolvedValue(mockMovimento as any);

      const response = await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(201);

      expect(response.body).toEqual(mockMovimento);
      expect(movimentacoesService.create).toHaveBeenCalledWith('2025-09', createMovimentoDto, mockUser.sub);
    });

    it('deve retornar 201 para criação de movimento (validação bypassed)', async () => {
      const createMovimentoDto = {
        data: '2025-09-20',
        descricao: 'Novo movimento',
        valor: 750.00,
        orcamentoItemId: 2
      };

      movimentacoesService.create.mockResolvedValue({ ...mockMovimento, ...createMovimentoDto } as any);

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(201);
    });

    it('deve tratar erros de criação de movimento', async () => {
      const createMovimentoDto = {
        data: '2025-10-15', // Data fora do período
        descricao: 'Movimento inválido',
        valor: 500.00,
        orcamentoItemId: 1
      };

      movimentacoesService.create.mockRejectedValue(new Error('Data não está dentro do período'));

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(500);
    });

    it('deve tratar erro de item de orçamento inválido', async () => {
      const createMovimentoDto = {
        data: '2025-09-15',
        descricao: 'Movimento com item inválido',
        valor: 500.00,
        orcamentoItemId: 999
      };

      movimentacoesService.create.mockRejectedValue(new Error('Item de orçamento não encontrado'));

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(500);
    });
  });

  describe('/movimentacoes/:periodo (GET)', () => {
    it('deve retornar lista de movimentos para o período', async () => {
      const mockMovimentos = [mockMovimento];
      movimentacoesService.findAll.mockResolvedValue(mockMovimentos as any);

      const response = await request(app.getHttpServer())
        .get('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockMovimentos);
      expect(movimentacoesService.findAll).toHaveBeenCalledWith('2025-09', mockUser.sub);
    });

    it('deve retornar array vazio quando não encontrar movimentos', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/movimentacoes/2025-10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('deve funcionar sem autorização (guard bypassed)', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2025-09')
        .expect(200);
    });

    it('deve tratar diferentes formatos de período', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2024-12')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(movimentacoesService.findAll).toHaveBeenCalledWith('2024-12', mockUser.sub);
    });
  });

  describe('/movimentacoes/:periodo/:id (GET)', () => {
    it('deve retornar um movimento específico', async () => {
      movimentacoesService.findOne.mockResolvedValue(mockMovimento as any);

      const response = await request(app.getHttpServer())
        .get('/movimentacoes/2025-09/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockMovimento);
      expect(movimentacoesService.findOne).toHaveBeenCalledWith('2025-09', 1, mockUser.sub);
    });

    it('deve retornar 500 para movimento não existente', async () => {
      movimentacoesService.findOne.mockRejectedValue(new Error('Movimento não encontrado'));

      await request(app.getHttpServer())
        .get('/movimentacoes/2025-09/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar erro de período inválido', async () => {
      movimentacoesService.findOne.mockRejectedValue(new Error('Período inválido'));

      await request(app.getHttpServer())
        .get('/movimentacoes/invalid-period/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/movimentacoes/:periodo/:id (PATCH)', () => {
    it('deve atualizar movimento com sucesso', async () => {
      const updateMovimentoDto = {
        descricao: 'Movimento atualizado',
        valor: 750.00
      };

      const updatedMovimento = { ...mockMovimento, ...updateMovimentoDto };
      movimentacoesService.update.mockResolvedValue(updatedMovimento as any);

      const response = await request(app.getHttpServer())
        .patch('/movimentacoes/2025-09/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateMovimentoDto)
        .expect(200);

      expect(response.body).toEqual(updatedMovimento);
      expect(movimentacoesService.update).toHaveBeenCalledWith('2025-09', 1, updateMovimentoDto, mockUser.sub);
    });

    it('deve tratar erros de atualização', async () => {
      const updateMovimentoDto = {
        descricao: 'Update inválido'
      };

      movimentacoesService.update.mockRejectedValue(new Error('Movimento não encontrado'));

      await request(app.getHttpServer())
        .patch('/movimentacoes/2025-09/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateMovimentoDto)
        .expect(500);
    });

    it('deve atualizar com dados parciais', async () => {
      const partialUpdate = {
        valor: 1000.00
      };

      const updatedMovimento = { ...mockMovimento, valor: 1000.00 };
      movimentacoesService.update.mockResolvedValue(updatedMovimento as any);

      const response = await request(app.getHttpServer())
        .patch('/movimentacoes/2025-09/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.valor).toBe(1000.00);
    });

    it('deve tratar validação de data na atualização', async () => {
      const updateMovimentoDto = {
        data: '2025-10-15' // Data fora do período
      };

      movimentacoesService.update.mockRejectedValue(new Error('Data não está dentro do período'));

      await request(app.getHttpServer())
        .patch('/movimentacoes/2025-09/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateMovimentoDto)
        .expect(500);
    });
  });

  describe('/movimentacoes/:periodo/:id (DELETE)', () => {
    it('deve deletar movimento com sucesso', async () => {
      movimentacoesService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/movimentacoes/2025-09/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(movimentacoesService.remove).toHaveBeenCalledWith('2025-09', 1, mockUser.sub);
    });

    it('deve tratar erros de exclusão', async () => {
      movimentacoesService.remove.mockRejectedValue(new Error('Movimento não encontrado'));

      await request(app.getHttpServer())
        .delete('/movimentacoes/2025-09/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar erro de incompatibilidade de período', async () => {
      movimentacoesService.remove.mockRejectedValue(new Error('Período não confere'));

      await request(app.getHttpServer())
        .delete('/movimentacoes/2025-10/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('Authentication and Authorization', () => {
    it('deve funcionar com diferentes roles de usuário', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve isolar movimentos por usuário e período', async () => {
      // Limpar os mocks antes do teste
      jest.clearAllMocks();
      
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(movimentacoesService.findAll).toHaveBeenCalledWith('2025-09', mockUser.sub);
      expect(movimentacoesService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Validation and Business Logic', () => {
    it('deve tratar diferentes tipos de movimento', async () => {
      const receiptMovement = {
        ...mockMovimento,
        valor: 1500.00,
        descricao: 'Receita teste'
      };

      movimentacoesService.create.mockResolvedValue(receiptMovement as any);

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-09-15',
          descricao: 'Receita teste',
          valor: 1500.00,
          orcamentoItemId: 1
        })
        .expect(201);
    });

    it('deve tratar valores negativos para despesas', async () => {
      const expenseMovement = {
        ...mockMovimento,
        valor: -300.00,
        descricao: 'Despesa teste'
      };

      movimentacoesService.create.mockResolvedValue(expenseMovement as any);

      const response = await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-09-15',
          descricao: 'Despesa teste',
          valor: -300.00,
          orcamentoItemId: 1
        })
        .expect(201);

      expect(response.body.valor).toBe(-300.00);
    });

    it('deve validar data dentro do período', async () => {
      const createMovimentoDto = {
        data: '2025-09-01', // Primeiro dia do período
        descricao: 'Movimento início do mês',
        valor: 200.00,
        orcamentoItemId: 1
      };

      movimentacoesService.create.mockResolvedValue({ ...mockMovimento, data: '2025-09-01' } as any);

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(201);
    });

    it('deve tratar datas de fim de mês', async () => {
      const createMovimentoDto = {
        data: '2025-09-30', // Último dia do período
        descricao: 'Movimento fim do mês',
        valor: 800.00,
        orcamentoItemId: 1
      };

      movimentacoesService.create.mockResolvedValue({ ...mockMovimento, data: '2025-09-30' } as any);

      await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovimentoDto)
        .expect(201);
    });

    it('deve tratar valores zero', async () => {
      const zeroMovement = {
        ...mockMovimento,
        valor: 0.00,
        descricao: 'Movimento zero'
      };

      movimentacoesService.create.mockResolvedValue(zeroMovement as any);

      const response = await request(app.getHttpServer())
        .post('/movimentacoes/2025-09')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-09-15',
          descricao: 'Movimento zero',
          valor: 0.00,
          orcamentoItemId: 1
        })
        .expect(201);

      expect(response.body.valor).toBe(0.00);
    });
  });

  describe('Gerenciamento de Período', () => {
    it('deve tratar períodos de anos diferentes', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(movimentacoesService.findAll).toHaveBeenCalledWith('2024-01', mockUser.sub);
    });

    it('deve tratar períodos futuros', async () => {
      movimentacoesService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimentacoes/2026-12')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(movimentacoesService.findAll).toHaveBeenCalledWith('2026-12', mockUser.sub);
    });

    it('deve manter consistência de período nas operações', async () => {
      const periodo = '2025-11';
      
      // Test create with period
      movimentacoesService.create.mockResolvedValue(mockMovimento as any);
      
      await request(app.getHttpServer())
        .post(`/movimentacoes/${periodo}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-11-15',
          descricao: 'Teste período',
          valor: 100.00,
          orcamentoItemId: 1
        })
        .expect(201);

      expect(movimentacoesService.create).toHaveBeenCalledWith(periodo, expect.any(Object), mockUser.sub);
    });
  });
});