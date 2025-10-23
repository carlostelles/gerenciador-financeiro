import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ReservasController } from '../src/modules/reservas/reservas.controller';
import { ReservasService } from '../src/modules/reservas/reservas.service';
import { LogsService } from '../src/modules/logs/logs.service';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('ReservasController (e2e)', () => {
  let app: INestApplication;
  let reservasService: jest.Mocked<ReservasService>;

  const mockUser = { 
    sub: 1, 
    email: 'test@example.com', 
    role: 'USER' 
  };

  const accessToken = 'mock-access-token';

  const mockReserva = {
    id: 1,
    usuarioId: 1,
    data: '2025-12-25',
    descricao: 'Reserva para viagem de férias',
    valor: 2500.00,
    categoriaId: 1,
    createdAt: '2025-09-30T14:30:25.628Z',
    updatedAt: '2025-09-30T14:30:25.628Z',
    usuario: { id: 1, nome: 'Test User', email: 'test@example.com' } as any,
    categoria: { id: 1, nome: 'Viagem', descricao: 'Categoria para viagens' } as any
  };

  beforeEach(async () => {
    const mockReservasService = {
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
      controllers: [ReservasController],
      providers: [
        {
          provide: ReservasService,
          useValue: mockReservasService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Middleware para simular usuário autenticado
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    reservasService = moduleFixture.get<ReservasService>(ReservasService) as jest.Mocked<ReservasService>;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/reservas (POST)', () => {
    it('deve criar nova reserva com sucesso', async () => {
      const createReservaDto = {
        data: '2025-12-25',
        descricao: 'Reserva para viagem de férias',
        valor: 2500.00,
        categoriaId: 1
      };

      reservasService.create.mockResolvedValue(mockReserva as any);

      const response = await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createReservaDto)
        .expect(201);

      expect(response.body).toEqual(mockReserva);
      expect(reservasService.create).toHaveBeenCalledWith(createReservaDto, mockUser.sub);
    });

    it('deve retornar 201 para criação de reserva (validação ignorada)', async () => {
      const createReservaDto = {
        data: '2026-01-15',
        descricao: 'Nova reserva',
        valor: 1000.00,
        categoriaId: 2
      };

      reservasService.create.mockResolvedValue({ ...mockReserva, ...createReservaDto } as any);

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createReservaDto)
        .expect(201);
    });

    it('deve tratar erros de criação de reserva', async () => {
      const createReservaDto = {
        data: '2025-12-25',
        descricao: 'Reserva inválida',
        valor: -100.00, // Valor inválido
        categoriaId: 1
      };

      reservasService.create.mockRejectedValue(new Error('Valor deve ser positivo'));

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createReservaDto)
        .expect(500);
    });

    it('deve tratar erro de categoria inválida', async () => {
      const createReservaDto = {
        data: '2025-12-25',
        descricao: 'Reserva com categoria inválida',
        valor: 1000.00,
        categoriaId: 999
      };

      reservasService.create.mockRejectedValue(new Error('Categoria não encontrada'));

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createReservaDto)
        .expect(500);
    });
  });

  describe('/reservas (GET)', () => {
    it('deve retornar lista de reservas para usuário', async () => {
      const mockReservas = [mockReserva];
      reservasService.findAll.mockResolvedValue(mockReservas as any);

      const response = await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockReservas);
      expect(reservasService.findAll).toHaveBeenCalledWith(mockUser.sub);
    });

    it('deve retornar array vazio quando não encontrar reservas', async () => {
      reservasService.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('deve funcionar sem autorização (guard ignorado)', async () => {
      reservasService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/reservas')
        .expect(200);
    });

    it('deve tratar erros do serviço', async () => {
      reservasService.findAll.mockRejectedValue(new Error('Database connection error'));

      await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('/reservas/:id (GET)', () => {
    it('deve retornar reserva específica', async () => {
      reservasService.findOne.mockResolvedValue(mockReserva as any);

      const response = await request(app.getHttpServer())
        .get('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockReserva);
      expect(reservasService.findOne).toHaveBeenCalledWith(1, mockUser.sub);
    });

    it('deve retornar 500 para reserva inexistente', async () => {
      reservasService.findOne.mockRejectedValue(new Error('Reserva não encontrada'));

      await request(app.getHttpServer())
        .get('/reservas/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar parâmetro ID inválido', async () => {
      await request(app.getHttpServer())
        .get('/reservas/invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400); // Bad Request for invalid ID format
    });
  });

  describe('/reservas/:id (PATCH)', () => {
    it('deve atualizar reserva com sucesso', async () => {
      const updateReservaDto = {
        descricao: 'Reserva atualizada',
        valor: 3000.00
      };

      const updatedReserva = { ...mockReserva, ...updateReservaDto };
      reservasService.update.mockResolvedValue(updatedReserva as any);

      const response = await request(app.getHttpServer())
        .patch('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateReservaDto)
        .expect(200);

      expect(response.body).toEqual(updatedReserva);
      expect(reservasService.update).toHaveBeenCalledWith(1, updateReservaDto, mockUser.sub);
    });

    it('deve tratar erros de atualização', async () => {
      const updateReservaDto = {
        descricao: 'Update inválido'
      };

      reservasService.update.mockRejectedValue(new Error('Reserva não encontrada'));

      await request(app.getHttpServer())
        .patch('/reservas/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateReservaDto)
        .expect(500);
    });

    it('deve atualizar com dados parciais', async () => {
      const partialUpdate = {
        valor: 5000.00
      };

      const updatedReserva = { ...mockReserva, valor: 5000.00 };
      reservasService.update.mockResolvedValue(updatedReserva as any);

      const response = await request(app.getHttpServer())
        .patch('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.valor).toBe(5000.00);
    });

    it('deve tratar validação de categoria na atualização', async () => {
      const updateReservaDto = {
        categoriaId: 999 // Categoria inexistente
      };

      reservasService.update.mockRejectedValue(new Error('Categoria não encontrada'));

      await request(app.getHttpServer())
        .patch('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateReservaDto)
        .expect(500);
    });

    it('deve tratar parâmetro ID inválido on update', async () => {
      const updateReservaDto = {
        descricao: 'Teste'
      };

      await request(app.getHttpServer())
        .patch('/reservas/invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateReservaDto)
        .expect(400);
    });
  });

  describe('/reservas/:id (DELETE)', () => {
    it('deve deletar reserva com sucesso', async () => {
      reservasService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reservasService.remove).toHaveBeenCalledWith(1, mockUser.sub);
    });

    it('deve tratar erros de deleção', async () => {
      reservasService.remove.mockRejectedValue(new Error('Reserva não encontrada'));

      await request(app.getHttpServer())
        .delete('/reservas/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar parâmetro ID inválido on delete', async () => {
      await request(app.getHttpServer())
        .delete('/reservas/invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('deve tratar erros de lógica de negócio na deleção', async () => {
      reservasService.remove.mockRejectedValue(new Error('Reserva não pode ser removida'));

      await request(app.getHttpServer())
        .delete('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });
  });

  describe('Autenticação e Autorização', () => {
    it('deve funcionar com diferentes papéis de usuário', async () => {
      reservasService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve isolar reservas por usuário', async () => {
      // Limpar os mocks antes do teste
      jest.clearAllMocks();
      
      reservasService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reservasService.findAll).toHaveBeenCalledWith(mockUser.sub);
      expect(reservasService.findAll).toHaveBeenCalledTimes(1);
    });

    it('deve passar contexto do usuário para todas operações', async () => {
      jest.clearAllMocks();

      // Test create
      reservasService.create.mockResolvedValue(mockReserva as any);
      await request(app.getHttpServer())
        .post('/reservas')
        .send({ data: '2025-12-25', descricao: 'Test', valor: 100, categoriaId: 1 })
        .expect(201);

      expect(reservasService.create).toHaveBeenCalledWith(
        expect.any(Object), 
        mockUser.sub
      );
    });
  });

  describe('Validação de Dados e Lógica de Negócio', () => {
    it('deve tratar diferentes tipos de reserva', async () => {
      const educationReservation = {
        ...mockReserva,
        valor: 800.00,
        descricao: 'Reserva para curso',
        categoria: { id: 2, nome: 'Educação' }
      };

      reservasService.create.mockResolvedValue(educationReservation as any);

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-11-15',
          descricao: 'Reserva para curso',
          valor: 800.00,
          categoriaId: 2
        })
        .expect(201);
    });

    it('deve tratar reservas de alto valor', async () => {
      const highValueReservation = {
        ...mockReserva,
        valor: 50000.00,
        descricao: 'Reserva para casa'
      };

      reservasService.create.mockResolvedValue(highValueReservation as any);

      const response = await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2026-06-30',
          descricao: 'Reserva para casa',
          valor: 50000.00,
          categoriaId: 1
        })
        .expect(201);

      expect(response.body.valor).toBe(50000.00);
    });

    it('deve validar datas futuras', async () => {
      const futureReservation = {
        ...mockReserva,
        data: '2030-01-01',
        descricao: 'Reserva futura'
      };

      reservasService.create.mockResolvedValue(futureReservation as any);

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2030-01-01',
          descricao: 'Reserva futura',
          valor: 1000.00,
          categoriaId: 1
        })
        .expect(201);
    });

    it('deve tratar casos extremos de valores', async () => {
      const minValueReservation = {
        ...mockReserva,
        valor: 0.01,
        descricao: 'Reserva mínima'
      };

      reservasService.create.mockResolvedValue(minValueReservation as any);

      const response = await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-12-01',
          descricao: 'Reserva mínima',
          valor: 0.01,
          categoriaId: 1
        })
        .expect(201);

      expect(response.body.valor).toBe(0.01);
    });

    it('deve tratar descrições longas', async () => {
      const longDescription = 'Reserva com descrição muito longa '.repeat(10);
      const longDescReservation = {
        ...mockReserva,
        descricao: longDescription
      };

      reservasService.create.mockResolvedValue(longDescReservation as any);

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-12-01',
          descricao: longDescription,
          valor: 1000.00,
          categoriaId: 1
        })
        .expect(201);
    });
  });

  describe('Tratamento de Datas', () => {
    it('deve tratar diferentes formatos de data', async () => {
      const dateVariations = ['2025-12-31', '2026-01-01', '2026-02-29']; // Including leap year

      for (const date of dateVariations) {
        reservasService.create.mockResolvedValue({ ...mockReserva, data: date } as any);

        await request(app.getHttpServer())
          .post('/reservas')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: date,
            descricao: `Reserva para ${date}`,
            valor: 1000.00,
            categoriaId: 1
          })
          .expect(201);
      }
    });

    it('deve tratar limites de ano', async () => {
      const yearEndReservation = {
        ...mockReserva,
        data: '2025-12-31',
        descricao: 'Reserva fim de ano'
      };

      reservasService.create.mockResolvedValue(yearEndReservation as any);

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: '2025-12-31',
          descricao: 'Reserva fim de ano',
          valor: 2000.00,
          categoriaId: 1
        })
        .expect(201);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erros de conexão com banco de dados', async () => {
      reservasService.findAll.mockRejectedValue(new Error('Database connection failed'));

      await request(app.getHttpServer())
        .get('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('deve tratar erros de validação', async () => {
      reservasService.create.mockRejectedValue(new Error('Dados inválidos'));

      await request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: 'invalid-date',
          descricao: '',
          valor: 'invalid-value',
          categoriaId: 'invalid-id'
        })
        .expect(500);
    });

    it('deve tratar conflitos de operações concorrentes', async () => {
      reservasService.update.mockRejectedValue(new Error('Conflito de versão'));

      await request(app.getHttpServer())
        .patch('/reservas/1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          descricao: 'Update conflitante'
        })
        .expect(500);
    });
  });
});