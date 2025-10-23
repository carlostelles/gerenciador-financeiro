import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LogsService } from '../logs/logs.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usuariosService: jest.Mocked<UsuariosService>;
  let jwtService: jest.Mocked<JwtService>;
  let logsService: jest.Mocked<LogsService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    senha: 'hashedPassword',
    nome: 'Test User',
    role: 'USER',
    ativo: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsuariosService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LogsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usuariosService = module.get(UsuariosService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    logsService = module.get(LogsService);

    configService.get.mockReturnValue('test-secret');
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', senha: 'password' };

    it('deve retornar tokens quando credenciais forem válidas', async () => {
      usuariosService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 300,
        tokenType: 'Bearer',
      });
      expect(logsService.create).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando usuário não for encontrado', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando senha for inválida', async () => {
      usuariosService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando usuário estiver inativo', async () => {
      const inactiveUser = { ...mockUser, ativo: false };
      usuariosService.findByEmail.mockResolvedValue(inactiveUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

    it('deve retornar novos tokens quando refresh token for válido', async () => {
      const payload = { sub: 1 };
      jwtService.verifyAsync.mockResolvedValue(payload);
      usuariosService.findOne.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh(refreshTokenDto);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 300,
        tokenType: 'Bearer',
      });
    });

    it('deve lançar UnauthorizedException quando refresh token for inválido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deve registrar a ação de logout', async () => {
      usuariosService.findOne.mockResolvedValue(mockUser as any);

      await service.logout(1);

      expect(logsService.create).toHaveBeenCalledWith({
        data: expect.any(Date),
        usuarioId: 1,
        descricao: expect.stringContaining('Logout realizado'),
        acao: 'LOGOUT',
      });
    });
  });
});
