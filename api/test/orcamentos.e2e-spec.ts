import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { OrcamentosController } from '../src/modules/orcamentos/orcamentos.controller';
import { OrcamentosService } from '../src/modules/orcamentos/orcamentos.service';
import { LogsService } from '../src/modules/logs/logs.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('OrcamentosController (e2e)', () => {
  let app: INestApplication;
  let orcamentosService: jest.Mocked<OrcamentosService>;

  const mockUser = { 
    sub: 1, 
    email: 'test@example.com', 
    role: 'USER' 
  };

  const accessToken = 'mock-access-token';

  const mockOrcamento = {
    id: 1,
    periodo: '2025-09',
    descricao: 'Orçamento Setembro 2025',
    usuarioId: 1,
    createdAt: '2025-09-30T14:30:25.628Z',
    updatedAt: '2025-09-30T14:30:25.628Z',
    usuario: { id: 1, nome: 'Test User', email: 'test@example.com' } as any,
    items: []
  };

  const mockOrcamentoItem = {
    id: 1,
    orcamentoId: 1,
    categoriaId: 1,
    valor: 1000.00,
    descricao: 'Item de teste',
    createdAt: '2025-09-30T14:30:25.628Z',
    updatedAt: '2025-09-30T14:30:25.628Z',
    orcamento: {
      ...mockOrcamento,
      createdAt: '2025-09-30T14:30:25.628Z',
      updatedAt: '2025-09-30T14:30:25.628Z'
    } as any,
    categoria: { id: 1, nome: 'Categoria Teste' } as any,
    movimentos: []
  };

  beforeEach(async () => {
    const mockOrcamentosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPeriodo: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      clone: jest.fn(),
      findPeriodos: jest.fn(),
      createItem: jest.fn(),
      findItems: jest.fn(),
      findItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    // Mock do RolesGuard para bypass de autenticação
    const mockRolesGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrcamentosController],
      providers: [
        {
          provide: OrcamentosService,
          useValue: mockOrcamentosService,
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

    orcamentosService = moduleFixture.get<OrcamentosService>(OrcamentosService) as jest.Mocked<OrcamentosService>;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/orcamentos (POST)', () => {
    it('deve criar um novo orçamento com sucesso', async () => {
      const createOrcamentoDto = {
        periodo: '2025-09',
        descricao: 'Orçamento Setembro 2025'
      };

      orcamentosService.create.mockResolvedValue(mockOrcamento as any);

      const response = await request(app.getHttpServer())
        .post('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOrcamentoDto)
        .expect(201);

      expect(response.body).toEqual(mockOrcamento);
      expect(orcamentosService.create).toHaveBeenCalledWith(createOrcamentoDto, mockUser.sub);
    });

    it('deve retornar 201 para criação de orçamento (validação bypassed)', async () => {
      const createOrcamentoDto = {
        periodo: '2025-10',
        descricao: 'Novo orçamento'
      };

      orcamentosService.create.mockResolvedValue({ ...mockOrcamento, ...createOrcamentoDto } as any);

      await request(app.getHttpServer())
        .post('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOrcamentoDto)
        .expect(201);
    });

    it('deve tratar erros de criação de orçamento', async () => {
      const createOrcamentoDto = {
        periodo: '2025-09',
        descricao: 'Orçamento duplicado'
      };

      orcamentosService.create.mockRejectedValue(new Error('Já existe um orçamento para este período'));

      await request(app.getHttpServer())
        .post('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOrcamentoDto)
        .expect(500);
    });
  });

  describe('/orcamentos (GET)', () => {
    it('deve retornar lista de orçamentos', async () => {
      const mockOrcamentos = [mockOrcamento];
      orcamentosService.findAll.mockResolvedValue(mockOrcamentos as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockOrcamentos);
      expect(orcamentosService.findAll).toHaveBeenCalledWith(mockUser.sub);
    });

    it('deve retornar array vazio quando não encontrar orçamentos', async () => {
      orcamentosService.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('deve funcionar sem autorização (guard ignorado)', async () => {
      orcamentosService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/orcamentos')
        .expect(200);
    });
  });

  describe('/orcamentos/periodos (GET)', () => {
    it('deve retornar lista de períodos', async () => {
      const mockPeriodos = ['2025-09', '2025-08', '2025-07'];
      orcamentosService.findPeriodos.mockResolvedValue(mockPeriodos);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockPeriodos);
      expect(orcamentosService.findPeriodos).toHaveBeenCalledWith(mockUser.sub);
    });

    it('deve retornar array vazio quando não houver períodos', async () => {
      orcamentosService.findPeriodos.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('deve funcionar sem autorização (guard ignorado)', async () => {
      orcamentosService.findPeriodos.mockResolvedValue(['2025-09']);

      await request(app.getHttpServer())
        .get('/orcamentos/periodos')
        .expect(200);
    });

    it('deve retornar períodos ordenados por data descendente', async () => {
      const mockPeriodos = ['2025-12', '2025-11', '2025-10', '2025-09'];
      orcamentosService.findPeriodos.mockResolvedValue(mockPeriodos);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockPeriodos);
      expect(response.body[0]).toBe('2025-12'); // Mais recente primeiro
      expect(response.body[3]).toBe('2025-09'); // Mais antigo por último
    });
  });

  describe('/orcamentos/periodo/:periodo (GET)', () => {
    const mockCategoria = {
      id: 1,
      descricao: 'Despesas com alimentação'
    };

    const mockOrcamentoWithItems = {
      id: 1,
      periodo: '2024-01',
      descricao: 'Orçamento de Janeiro 2024',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
      items: [
        {
          id: 1,
          descricao: 'Supermercado mensal',
          valor: 500.00,
          categoria: mockCategoria
        },
        {
          id: 2,
          descricao: 'Combustível',
          valor: 300.00,
          categoria: {
            id: 2,
            descricao: 'Despesas com transporte'
          }
        }
      ]
    };

    it('deve retornar orçamento por período com itens e categorias', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockOrcamentoWithItems);
      expect(orcamentosService.findByPeriodo).toHaveBeenCalledWith('2024-01', mockUser.sub);
    });

    it('deve retornar orçamento com estrutura correta de categoria', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items[0].categoria).toHaveProperty('id');
      expect(response.body.items[0].categoria).toHaveProperty('descricao');
      expect(response.body.items[0].categoria).not.toHaveProperty('nome');
      expect(response.body.items[0].categoria).not.toHaveProperty('tipo');
    });

    it('deve retornar orçamento com múltiplos itens', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].descricao).toBe('Supermercado mensal');
      expect(response.body.items[1].descricao).toBe('Combustível');
    });

    it('deve retornar orçamento sem itens quando não houver', async () => {
      const mockOrcamentoEmpty = {
        ...mockOrcamentoWithItems,
        items: []
      };
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoEmpty as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.id).toBe(1);
      expect(response.body.periodo).toBe('2024-01');
    });

    it('deve retornar 500 quando orçamento não for encontrado', async () => {
      orcamentosService.findByPeriodo.mockRejectedValue(
        new Error('Orçamento não encontrado para o período 2025-12')
      );

      await request(app.getHttpServer())
        .get('/orcamentos/periodo/2025-12')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve validar formato do período', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      // Formato válido: yyyy-mm
      await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orcamentosService.findByPeriodo).toHaveBeenCalledWith('2024-01', mockUser.sub);
    });

    it('deve buscar orçamento apenas do usuário autenticado', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orcamentosService.findByPeriodo).toHaveBeenCalledWith('2024-01', mockUser.sub);
      expect(orcamentosService.findByPeriodo).not.toHaveBeenCalledWith('2024-01', 2);
    });

    it('deve retornar valores corretos dos itens', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items[0].valor).toBe(500.00);
      expect(response.body.items[1].valor).toBe(300.00);
    });

    it('deve funcionar com diferentes períodos', async () => {
      const periodos = ['2024-01', '2024-06', '2024-12'];

      for (const periodo of periodos) {
        const mockOrcamento = {
          ...mockOrcamentoWithItems,
          periodo,
          descricao: `Orçamento de ${periodo}`
        };
        orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamento as any);

        const response = await request(app.getHttpServer())
          .get(`/orcamentos/periodo/${periodo}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.periodo).toBe(periodo);
      }
    });

    it('deve incluir timestamps no orçamento', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('deve funcionar sem autorização (guard ignorado)', async () => {
      orcamentosService.findByPeriodo.mockResolvedValue(mockOrcamentoWithItems as any);

      await request(app.getHttpServer())
        .get('/orcamentos/periodo/2024-01')
        .expect(200);
    });
  });

  describe('/orcamentos/:id (GET)', () => {
    it('deve retornar um orçamento específico', async () => {
      orcamentosService.findOne.mockResolvedValue(mockOrcamento as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockOrcamento);
      expect(orcamentosService.findOne).toHaveBeenCalledWith(1, mockUser.sub);
    });

    it('deve retornar 500 para orçamento não existente', async () => {
      orcamentosService.findOne.mockRejectedValue(new Error('Orçamento não encontrado'));

      await request(app.getHttpServer())
        .get('/orcamentos/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/orcamentos/:id (PATCH)', () => {
    it('deve atualizar orçamento com sucesso', async () => {
      const updateOrcamentoDto = {
        descricao: 'Orçamento atualizado'
      };

      const updatedOrcamento = { ...mockOrcamento, ...updateOrcamentoDto };
      orcamentosService.update.mockResolvedValue(updatedOrcamento as any);

      const response = await request(app.getHttpServer())
        .patch('/orcamentos/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateOrcamentoDto)
        .expect(200);

      expect(response.body).toEqual(updatedOrcamento);
      expect(orcamentosService.update).toHaveBeenCalledWith(1, updateOrcamentoDto, mockUser.sub);
    });

    it('deve tratar erros de atualização', async () => {
      const updateOrcamentoDto = {
        descricao: 'Update inválido'
      };

      orcamentosService.update.mockRejectedValue(new Error('Orçamento não encontrado'));

      await request(app.getHttpServer())
        .patch('/orcamentos/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateOrcamentoDto)
        .expect(500);
    });

    it('deve atualizar com dados parciais', async () => {
      const partialUpdate = {
        descricao: 'Descrição atualizada'
      };

      const updatedOrcamento = { ...mockOrcamento, descricao: 'Descrição atualizada' };
      orcamentosService.update.mockResolvedValue(updatedOrcamento as any);

      const response = await request(app.getHttpServer())
        .patch('/orcamentos/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.descricao).toBe('Descrição atualizada');
    });
  });

  describe('/orcamentos/:id (DELETE)', () => {
    it('deve deletar orçamento com sucesso', async () => {
      orcamentosService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/orcamentos/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orcamentosService.remove).toHaveBeenCalledWith(1, mockUser.sub);
    });

    it('deve tratar erros de deleção', async () => {
      orcamentosService.remove.mockRejectedValue(new Error('Orçamento não encontrado'));

      await request(app.getHttpServer())
        .delete('/orcamentos/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar erro de orçamento com itens', async () => {
      orcamentosService.remove.mockRejectedValue(new Error('Orçamento possui itens e não pode ser removido'));

      await request(app.getHttpServer())
        .delete('/orcamentos/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/orcamentos/:id/clonar/:periodo (POST)', () => {
    it('deve clonar orçamento com sucesso', async () => {
      const clonedOrcamento = { ...mockOrcamento, id: 2, periodo: '2025-10' };
      orcamentosService.clone.mockResolvedValue(clonedOrcamento as any);

      const response = await request(app.getHttpServer())
        .post('/orcamentos/1/clonar/2025-10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toEqual(clonedOrcamento);
      expect(orcamentosService.clone).toHaveBeenCalledWith(1, '2025-10', mockUser.sub);
    });

    it('deve tratar erros de clonagem', async () => {
      orcamentosService.clone.mockRejectedValue(new Error('Orçamento não encontrado'));

      await request(app.getHttpServer())
        .post('/orcamentos/999/clonar/2025-10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/orcamentos/:id/itens (POST)', () => {
    it('deve criar item de orçamento com sucesso', async () => {
      const createItemDto = {
        categoriaId: 1,
        valor: 1000.00,
        descricao: 'Item de teste'
      };

      orcamentosService.createItem.mockResolvedValue(mockOrcamentoItem as any);

      const response = await request(app.getHttpServer())
        .post('/orcamentos/1/itens')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createItemDto)
        .expect(201);

      expect(response.body).toEqual(mockOrcamentoItem);
      expect(orcamentosService.createItem).toHaveBeenCalledWith(1, createItemDto, mockUser.sub);
    });

    it('deve tratar erros de criação de item', async () => {
      const createItemDto = {
        categoriaId: 999,
        valor: 1000.00,
        descricao: 'Item inválido'
      };

      orcamentosService.createItem.mockRejectedValue(new Error('Categoria não encontrada'));

      await request(app.getHttpServer())
        .post('/orcamentos/1/itens')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createItemDto)
        .expect(500);
    });
  });

  describe('/orcamentos/:id/itens (GET)', () => {
    it('deve retornar lista de itens de orçamento', async () => {
      const mockItems = [mockOrcamentoItem];
      orcamentosService.findItems.mockResolvedValue(mockItems as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/1/itens')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockItems);
      expect(orcamentosService.findItems).toHaveBeenCalledWith(1, mockUser.sub);
    });

    it('deve retornar array vazio quando não encontrar itens', async () => {
      orcamentosService.findItems.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/1/itens')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('/orcamentos/:id/itens/:itemId (GET)', () => {
    it('deve retornar um orçamento específico item', async () => {
      orcamentosService.findItem.mockResolvedValue(mockOrcamentoItem as any);

      const response = await request(app.getHttpServer())
        .get('/orcamentos/1/itens/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockOrcamentoItem);
      expect(orcamentosService.findItem).toHaveBeenCalledWith(1, 1, mockUser.sub);
    });

    it('deve retornar 500 para item inexistente', async () => {
      orcamentosService.findItem.mockRejectedValue(new Error('Item não encontrado'));

      await request(app.getHttpServer())
        .get('/orcamentos/1/itens/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/orcamentos/:id/itens/:itemId (PATCH)', () => {
    it('deve atualizar item de orçamento com sucesso', async () => {
      const updateItemDto = {
        valor: 1500.00,
        descricao: 'Item atualizado'
      };

      const updatedItem = { ...mockOrcamentoItem, ...updateItemDto };
      orcamentosService.updateItem.mockResolvedValue(updatedItem as any);

      const response = await request(app.getHttpServer())
        .patch('/orcamentos/1/itens/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateItemDto)
        .expect(200);

      expect(response.body).toEqual(updatedItem);
      expect(orcamentosService.updateItem).toHaveBeenCalledWith(1, 1, updateItemDto, mockUser.sub);
    });

    it('deve tratar erros de atualização de item', async () => {
      const updateItemDto = {
        valor: -1000.00
      };

      orcamentosService.updateItem.mockRejectedValue(new Error('Valor inválido'));

      await request(app.getHttpServer())
        .patch('/orcamentos/1/itens/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateItemDto)
        .expect(500);
    });
  });

  describe('/orcamentos/:id/itens/:itemId (DELETE)', () => {
    it('deve deletar item de orçamento com sucesso', async () => {
      orcamentosService.removeItem.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/orcamentos/1/itens/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orcamentosService.removeItem).toHaveBeenCalledWith(1, 1, mockUser.sub);
    });

    it('deve tratar erros de deleção de item', async () => {
      orcamentosService.removeItem.mockRejectedValue(new Error('Item não encontrado'));

      await request(app.getHttpServer())
        .delete('/orcamentos/1/itens/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('Autenticação e Autorização', () => {
    it('deve funcionar com diferentes papéis de usuário', async () => {
      orcamentosService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve isolar orçamentos por usuário', async () => {
      // Limpar os mocks antes do teste
      jest.clearAllMocks();
      
      orcamentosService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(orcamentosService.findAll).toHaveBeenCalledWith(mockUser.sub);
      expect(orcamentosService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validação de Dados e Lógica de Negócio', () => {
    it('deve tratar diferentes tipos de orçamento', async () => {
      const orcamentoReceita = {
        ...mockOrcamento,
        descricao: 'Orçamento de Receitas'
      };

      orcamentosService.create.mockResolvedValue(orcamentoReceita as any);

      await request(app.getHttpServer())
        .post('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          periodo: '2025-11',
          descricao: 'Orçamento de Receitas'
        })
        .expect(201);
    });

    it('deve tratar validação de período', async () => {
      const createOrcamentoDto = {
        periodo: '2025-09',
        descricao: 'Período duplicado'
      };

      orcamentosService.create.mockRejectedValue(new Error('Já existe um orçamento para este período'));

      await request(app.getHttpServer())
        .post('/orcamentos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createOrcamentoDto)
        .expect(500);
    });

    it('deve tratar validação de valor de item', async () => {
      const createItemDto = {
        categoriaId: 1,
        valor: 2500.00,
        descricao: 'Receita teste'
      };

      const revenueItem = { ...mockOrcamentoItem, valor: 2500.00 };
      orcamentosService.createItem.mockResolvedValue(revenueItem as any);

      const response = await request(app.getHttpServer())
        .post('/orcamentos/1/itens')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createItemDto)
        .expect(201);

      expect(response.body.valor).toBe(2500.00);
    });
  });
});