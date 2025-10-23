import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { LogsService } from '../logs/logs.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import { UserRole } from '../../common/types';

// Mock bcrypt with proper typing
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repository: jest.Mocked<Repository<Usuario>>;
  let logsService: jest.Mocked<LogsService>;

  const mockUsuario = {
    id: 1,
    nome: 'Test User',
    email: 'test@example.com',
    telefone: '11999999999',
    senha: 'hashedPassword',
    role: UserRole.USER,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categorias: [],
    orcamentos: [],
    movimentos: [],
    reservas: [],
  } as Usuario;

  const mockCreateUsuarioDto: CreateUsuarioDto = {
    nome: 'Test User',
    email: 'test@example.com',
    telefone: '11999999999',
    senha: 'password123',
    role: UserRole.USER,
  };

  const mockCurrentUser = {
    sub: 2,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockRepository,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    repository = module.get(getRepositoryToken(Usuario));
    logsService = module.get(LogsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo usuário com sucesso', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUsuario);
      repository.save.mockResolvedValue(mockUsuario);
      logsService.create.mockResolvedValue(undefined);

      const result = await service.create(mockCreateUsuarioDto);

      expect(repository.findOne).toHaveBeenCalledTimes(2);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateUsuarioDto,
        senha: 'hashedPassword',
        role: UserRole.USER,
      });
      expect(repository.save).toHaveBeenCalledWith(mockUsuario);
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(mockUsuario);
    });

    it('deve lançar ConflictException quando email já existir', async () => {
      repository.findOne.mockResolvedValueOnce(mockUsuario);

      await expect(service.create(mockCreateUsuarioDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateUsuarioDto.email },
      });
    });

    it('deve lançar ConflictException quando telefone já existir', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUsuario);

      await expect(service.create(mockCreateUsuarioDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { telefone: mockCreateUsuarioDto.telefone },
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os usuários', async () => {
      const mockUsers = [mockUsuario];
      repository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        select: ['id', 'nome', 'email', 'telefone', 'role', 'ativo', 'createdAt', 'updatedAt'],
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando encontrado', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'nome', 'email', 'telefone', 'role', 'ativo', 'createdAt', 'updatedAt'],
      });
      expect(result).toEqual(mockUsuario);
    });

    it('deve lançar NotFoundException quando usuário não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário quando encontrado by email', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUsuario);
    });

    it('deve retornar null quando usuário não for encontrado por email', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const mockUpdateDto: UpdateUsuarioDto = {
      nome: 'Updated Name',
    };

    it('deve atualizar usuário com sucesso como admin', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      repository.update.mockResolvedValue(undefined);
      
      const updatedUser = { ...mockUsuario, nome: 'Updated Name' };
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedUser);
      logsService.create.mockResolvedValue(undefined);

      const result = await service.update(1, mockUpdateDto, mockCurrentUser);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.update).toHaveBeenCalledWith(1, mockUpdateDto);
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });

    it('deve lançar NotFoundException quando usuário não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, mockUpdateDto, mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando usuário tentar atualizar outro usuário', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      const regularUser = { ...mockCurrentUser, role: UserRole.USER, sub: 2 };

      await expect(
        service.update(1, mockUpdateDto, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException quando usuário tentar alterar próprio papel', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      const regularUser = { ...mockCurrentUser, role: UserRole.USER, sub: 1 };
      const updateWithRole = { ...mockUpdateDto, role: UserRole.ADMIN };

      await expect(
        service.update(1, updateWithRole, regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deve desativar usuário com sucesso como admin', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      repository.update.mockResolvedValue(undefined);
      logsService.create.mockResolvedValue(undefined);

      await service.remove(1, mockCurrentUser);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.update).toHaveBeenCalledWith(1, { ativo: false });
      expect(logsService.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando usuário não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando não-admin tentar remover usuário', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      const regularUser = { ...mockCurrentUser, role: UserRole.USER };

      await expect(service.remove(1, regularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar ForbiddenException quando admin tentar remover a si mesmo', async () => {
      repository.findOne.mockResolvedValue(mockUsuario);
      const selfUser = { ...mockCurrentUser, sub: 1 };

      await expect(service.remove(1, selfUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
