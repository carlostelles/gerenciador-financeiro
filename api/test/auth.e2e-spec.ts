import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { LogsService } from '../src/modules/logs/logs.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;
  let usuariosService: jest.Mocked<UsuariosService>;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    nome: 'Test User',
    email: 'test@example.com',
    senha: '',
    telefone: '11999999999',
    role: 'USER',
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock do JWT Guard
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token de acesso requerido');
      }
      
      const token = authHeader.split(' ')[1];
      if (token === 'valid-access-token') {
        request.user = { sub: 123, email: 'test@example.com' };
        return true;
      }
      
      throw new UnauthorizedException('Token inválido');
    }),
  };

  beforeEach(async () => {
    // Hash da senha para os testes
    mockUser.senha = await bcrypt.hash('password123', 10);

    const mockAuthService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const mockUsuariosService = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsuariosService,
          useValue: mockUsuariosService,
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
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '5m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
        JwtService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Habilitar validação global para testar DTOs
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();

    authService = moduleFixture.get(AuthService);
    usuariosService = moduleFixture.get(UsuariosService);
    jwtService = moduleFixture.get(JwtService);
  });

  describe('/auth/login (POST)', () => {
    it('deve fazer login com sucesso com credenciais válidas', () => {
      const mockLoginResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 300,
        tokenType: 'Bearer',
      };

      authService.login.mockResolvedValue(mockLoginResponse);

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          senha: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body).toHaveProperty('tokenType');
        });
    });

    it('deve retornar 500 para credenciais inválidas', () => {
      authService.login.mockRejectedValue(new Error('Credenciais inválidas'));

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          senha: 'wrongpassword',
        })
        .expect(500);
    });

    it('deve retornar 400 para campos ausentes', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('deve renovar token com sucesso', async () => {
      const mockRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 300,
        tokenType: 'Bearer',
      };

      authService.refresh.mockResolvedValue(mockRefreshResponse);

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('deve retornar 500 para refresh token inválido', () => {
      authService.refresh.mockRejectedValue(new Error('Token inválido'));

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(500);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('deve fazer logout com sucesso quando autenticado', async () => {
      const mockAccessToken = 'valid-access-token';
      authService.logout.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Logout realizado com sucesso',
          });
        });
    });

    it('deve retornar 401 quando não autenticado', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('deve retornar 401 quando token é inválido', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('deve retornar 401 quando Authorization header está ausente', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('deve retornar 401 quando Authorization header está malformado', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('deve retornar 500 quando o serviço falha', () => {
      const mockAccessToken = 'valid-access-token';
      authService.logout.mockRejectedValue(new Error('Erro interno'));

      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(500);
    });

    it('deve chamar authService.logout com userId correto', async () => {
      const mockAccessToken = 'valid-access-token';
      authService.logout.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(authService.logout).toHaveBeenCalledWith(123);
    });
  });

  describe('Validações de entrada', () => {
    describe('/auth/login (POST)', () => {
      it('deve retornar 400 para email inválido', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'invalid-email',
            senha: 'password123',
          })
          .expect(400);
      });

      it('deve retornar 400 para senha muito curta', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            senha: '1234567', // Menos que 8 caracteres
          })
          .expect(400);
      });

      it('deve retornar 400 para senha muito longa', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            senha: '12345678901234567', // Mais que 16 caracteres
          })
          .expect(400);
      });

      it('deve retornar 400 para dados vazios', async () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({})
          .expect(400);
      });
    });

    describe('/auth/refresh (POST)', () => {
      it('deve retornar 400 para refresh token ausente', async () => {
        return request(app.getHttpServer())
          .post('/auth/refresh')
          .send({})
          .expect(400);
      });

      it('deve retornar 200 para refresh token vazio (DTO permite)', async () => {
        const mockRefreshResponse = {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 300,
          tokenType: 'Bearer',
        };

        authService.refresh.mockResolvedValue(mockRefreshResponse);

        return request(app.getHttpServer())
          .post('/auth/refresh')
          .send({
            refreshToken: '',
          })
          .expect(200);
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
