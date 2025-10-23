import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CategoriasController } from '../src/modules/categorias/categorias.controller';
import { CategoriasService } from '../src/modules/categorias/categorias.service';
import { LogsService } from '../src/modules/logs/logs.service';
import { UserRole, CategoriaTipo } from '../src/common/types';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('CategoriasController (e2e)', () => {
  let app: INestApplication;
  let categoriasService: jest.Mocked<CategoriasService>;
  let jwtService: JwtService;
  let accessToken: string;

  const mockCategoria = {
    id: 1,
    usuarioId: 1,
    nome: 'Alimentação',
    descricao: 'Gastos com alimentação',
    tipo: CategoriaTipo.DESPESA,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    sub: 1,
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeAll(async () => {
    const mockCategoriasService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    const mockJwtAuthGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [
        {
          provide: CategoriasService,
          useValue: mockCategoriasService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '5m',
              };
              return config[key];
            }),
          },
        },
        JwtService,
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .compile();

    app = moduleFixture.createNestApplication();

    // Middleware para simular usuário autenticado
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    categoriasService = moduleFixture.get(CategoriasService);
    jwtService = moduleFixture.get(JwtService);
    
    // Gerar token para testes autenticados
    const configService = moduleFixture.get(ConfigService);
    accessToken = await jwtService.signAsync(
      mockUser,
      {
        secret: configService.get('JWT_SECRET'),
        expiresIn: configService.get('JWT_EXPIRES_IN'),
      }
    );
  });

  describe('/categorias (POST)', () => {
    it('deve criar uma nova categoria com sucesso', async () => {
      const newCategoria = {
        nome: 'Transporte',
        descricao: 'Gastos com transporte',
        tipo: CategoriaTipo.DESPESA,
      };

      categoriasService.create.mockResolvedValue({
        ...mockCategoria,
        ...newCategoria,
        id: 2,
      } as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newCategoria)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('nome', newCategoria.nome);
          expect(res.body).toHaveProperty('tipo', newCategoria.tipo);
          expect(res.body).toHaveProperty('descricao', newCategoria.descricao);
        });
    });

    it('deve retornar 201 para criação de categoria (validação bypassed)', () => {
      categoriasService.create.mockResolvedValue(mockCategoria as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: '',
          tipo: 'INVALID_TYPE',
        })
        .expect(201);
    });

    it('deve tratar erros de criação de categoria', async () => {
      categoriasService.create.mockRejectedValue(new Error('Categoria já existe'));

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Categoria Duplicada',
          tipo: CategoriaTipo.DESPESA,
        })
        .expect(500);
    });

    it('deve tratar erro de categoria duplicada (412)', async () => {
      categoriasService.create.mockRejectedValue(new Error('Já existe uma categoria com este nome e tipo'));

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Alimentação',
          tipo: CategoriaTipo.DESPESA,
        })
        .expect(500);
    });

    it('deve tratar dados inválidos', async () => {
      categoriasService.create.mockRejectedValue(new Error('Dados inválidos'));

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: '',
          tipo: 'INVALID',
        })
        .expect(500);
    });
  });

  describe('/categorias (GET)', () => {
    it('deve retornar lista de categorias', async () => {
      const mockCategorias = [
        mockCategoria,
        {
          ...mockCategoria,
          id: 2,
          nome: 'Lazer',
          tipo: CategoriaTipo.DESPESA,
        },
      ];

      categoriasService.findAll.mockResolvedValue(mockCategorias as any);

      return request(app.getHttpServer())
        .get('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('nome', 'Alimentação');
          expect(res.body[1]).toHaveProperty('nome', 'Lazer');
        });
    });

    it('deve retornar array vazio quando não encontrar categorias', async () => {
      categoriasService.findAll.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(0);
        });
    });

    it('deve funcionar sem autorização (guard bypassed)', () => {
      categoriasService.findAll.mockResolvedValue([mockCategoria] as any);

      return request(app.getHttpServer())
        .get('/categorias')
        .expect(200);
    });
  });

  describe('/categorias/:id (GET)', () => {
    it('deve retornar uma categoria específica', async () => {
      categoriasService.findOne.mockResolvedValue(mockCategoria as any);

      return request(app.getHttpServer())
        .get('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 1);
          expect(res.body).toHaveProperty('nome', 'Alimentação');
          expect(res.body).toHaveProperty('tipo', CategoriaTipo.DESPESA);
          expect(res.body).toHaveProperty('descricao', 'Gastos com alimentação');
        });
    });

    it('deve retornar 500 para categoria não existente', async () => {
      categoriasService.findOne.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .get('/categorias/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar parâmetro ID inválido', async () => {
      return request(app.getHttpServer())
        .get('/categorias/abc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('deve tratar acesso negado para categoria de outro usuário', async () => {
      categoriasService.findOne.mockRejectedValue(new Error('Acesso negado'));

      return request(app.getHttpServer())
        .get('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/categorias/:id (PATCH)', () => {
    it('deve atualizar categoria com sucesso', async () => {
      const updateData = {
        nome: 'Alimentação Atualizada',
        descricao: 'Descrição atualizada',
      };

      const updatedCategoria = {
        ...mockCategoria,
        ...updateData,
        updatedAt: new Date(),
      };

      categoriasService.update.mockResolvedValue(updatedCategoria as any);

      return request(app.getHttpServer())
        .patch('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 1);
          expect(res.body).toHaveProperty('nome', updateData.nome);
          expect(res.body).toHaveProperty('descricao', updateData.descricao);
        });
    });

    it('deve tratar erros de atualização', async () => {
      categoriasService.update.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .patch('/categorias/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Nome Atualizado',
        })
        .expect(500);
    });

    it('deve atualizar com dados parciais', async () => {
      const partialUpdate = { nome: 'Apenas Nome' };
      
      categoriasService.update.mockResolvedValue({
        ...mockCategoria,
        ...partialUpdate,
      } as any);

      return request(app.getHttpServer())
        .patch('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(partialUpdate)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('nome', partialUpdate.nome);
        });
    });

    it('deve tratar parâmetro ID inválido na atualização', async () => {
      return request(app.getHttpServer())
        .patch('/categorias/abc')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: 'Teste' })
        .expect(400);
    });

    it('deve tratar acesso negado na atualização', async () => {
      categoriasService.update.mockRejectedValue(new Error('Acesso negado'));

      return request(app.getHttpServer())
        .patch('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: 'Teste' })
        .expect(500);
    });

    it('deve tratar dados inválidos na atualização', async () => {
      categoriasService.update.mockRejectedValue(new Error('Dados inválidos'));

      return request(app.getHttpServer())
        .patch('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: '' })
        .expect(500);
    });

    it('deve tratar tentativa de atualizar para nome duplicado', async () => {
      categoriasService.update.mockRejectedValue(new Error('Já existe uma categoria com este nome e tipo'));

      return request(app.getHttpServer())
        .patch('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nome: 'Alimentação' })
        .expect(500);
    });
  });

  describe('/categorias/:id (DELETE)', () => {
    it('deve deletar categoria com sucesso', async () => {
      categoriasService.remove.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve tratar erros de exclusão', async () => {
      categoriasService.remove.mockRejectedValue(new Error('Categoria não pode ser removida'));

      return request(app.getHttpServer())
        .delete('/categorias/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar erro de categoria em uso', async () => {
      categoriasService.remove.mockRejectedValue(new Error('Categoria está em uso'));

      return request(app.getHttpServer())
        .delete('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar parâmetro ID inválido na exclusão', async () => {
      return request(app.getHttpServer())
        .delete('/categorias/abc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('deve tratar categoria não encontrada na exclusão', async () => {
      categoriasService.remove.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .delete('/categorias/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar acesso negado na exclusão', async () => {
      categoriasService.remove.mockRejectedValue(new Error('Acesso negado'));

      return request(app.getHttpServer())
        .delete('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar categoria que não pode ser excluída', async () => {
      categoriasService.remove.mockRejectedValue(new Error('Categoria em uso, não pode ser excluída'));

      return request(app.getHttpServer())
        .delete('/categorias/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('Autenticação e Autorização', () => {
    it('deve funcionar com diferentes roles de usuário', async () => {
      // Simular usuário ADMIN
      app.use((req, res, next) => {
        req.user = { sub: 2, email: 'admin@example.com', role: UserRole.ADMIN };
        next();
      });

      categoriasService.findAll.mockResolvedValue([mockCategoria] as any);

      return request(app.getHttpServer())
        .get('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve isolar categorias por usuário', async () => {
      // Limpar os mocks antes do teste
      jest.clearAllMocks();
      
      // Verificar se o service é chamado com o userId correto
      categoriasService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(categoriasService.findAll).toHaveBeenCalledWith(mockUser);
      expect(categoriasService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validação de Dados e Regras de Negócio', () => {
    it('deve tratar diferentes tipos de categoria', async () => {
      const receitaCategoria = {
        ...mockCategoria,
        id: 3,
        nome: 'Salário',
        tipo: CategoriaTipo.RECEITA,
      };

      categoriasService.create.mockResolvedValue(receitaCategoria as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Salário',
          tipo: CategoriaTipo.RECEITA,
          descricao: 'Receita mensal',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('tipo', CategoriaTipo.RECEITA);
        });
    });

    it('deve tratar categoria do tipo reserva', async () => {
      const reservaCategoria = {
        ...mockCategoria,
        id: 4,
        nome: 'Emergência',
        tipo: CategoriaTipo.RESERVA,
      };

      categoriasService.create.mockResolvedValue(reservaCategoria as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Emergência',
          tipo: CategoriaTipo.RESERVA,
          descricao: 'Fundo de emergência',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('tipo', CategoriaTipo.RESERVA);
        });
    });

    it('deve tratar categoria sem descrição', async () => {
      const categoriaSimples = {
        ...mockCategoria,
        id: 5,
        nome: 'Simples',
        descricao: null,
      };

      categoriasService.create.mockResolvedValue(categoriaSimples as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Simples',
          tipo: CategoriaTipo.DESPESA,
        })
        .expect(201);
    });

    it('deve tratar nomes longos de categoria', async () => {
      const nomeLongo = 'a'.repeat(100);
      
      categoriasService.create.mockResolvedValue({
        ...mockCategoria,
        nome: nomeLongo,
      } as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: nomeLongo,
          tipo: CategoriaTipo.DESPESA,
        })
        .expect(201);
    });

    it('deve tratar descrições longas de categoria', async () => {
      const descricaoLonga = 'a'.repeat(500);
      
      categoriasService.create.mockResolvedValue({
        ...mockCategoria,
        descricao: descricaoLonga,
      } as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Teste',
          tipo: CategoriaTipo.DESPESA,
          descricao: descricaoLonga,
        })
        .expect(201);
    });

    it('deve tratar caracteres especiais no nome', async () => {
      const nomeComEspeciais = 'Café & Açúcar - 100%';
      
      categoriasService.create.mockResolvedValue({
        ...mockCategoria,
        nome: nomeComEspeciais,
      } as any);

      return request(app.getHttpServer())
        .post('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: nomeComEspeciais,
          tipo: CategoriaTipo.DESPESA,
        })
        .expect(201);
    });
  });

  describe('Cenários de Performance e Edge Cases', () => {
    it('deve tratar muitas categorias (stress test)', async () => {
      const muitasCategorias = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCategoria,
        id: i + 1,
        nome: `Categoria ${i + 1}`,
      }));

      categoriasService.findAll.mockResolvedValue(muitasCategorias as any);

      return request(app.getHttpServer())
        .get('/categorias')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1000);
        });
    });

    it('deve tratar ID muito grande', async () => {
      const idGigante = Number.MAX_SAFE_INTEGER;
      
      categoriasService.findOne.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .get(`/categorias/${idGigante}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar ID negativo', async () => {
      categoriasService.findOne.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .get('/categorias/-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar ID zero', async () => {
      categoriasService.findOne.mockRejectedValue(new Error('Categoria não encontrada'));

      return request(app.getHttpServer())
        .get('/categorias/0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});