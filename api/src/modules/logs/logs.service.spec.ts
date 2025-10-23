import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { LogsService } from './logs.service';
import { Log, LogDocument } from './schemas/log.schema';
import { CreateLogDto } from './dto/log.dto';
import { UserRole, LogAcao } from '../../common/types';

describe('LogsService', () => {
  let service: LogsService;
  let model: jest.Mocked<Model<LogDocument>>;

  const mockLog = {
    _id: 'mockId',
    data: new Date(),
    usuarioId: 1,
    descricao: 'Test log',
    acao: LogAcao.CREATE,
    entidade: 'Test',
    entidadeId: '1',
    dadosNovos: { test: 'data' },
    save: jest.fn(),
  };

  const mockCreateLogDto: CreateLogDto = {
    data: new Date(),
    usuarioId: 1,
    descricao: 'Test log',
    acao: LogAcao.CREATE,
    entidade: 'Test',
    entidadeId: '1',
    dadosNovos: { test: 'data' },
  };

  const mockAdminUser = {
    sub: 1,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockRegularUser = {
    sub: 2,
    email: 'user@example.com',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    const mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    // Mock do constructor do model
    const MockLogModel = jest.fn().mockImplementation(() => mockLog);
    Object.assign(MockLogModel, mockModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: getModelToken(Log.name),
          useValue: MockLogModel,
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
    model = module.get(getModelToken(Log.name));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo log com sucesso', async () => {
      mockLog.save.mockResolvedValue(mockLog);

      const result = await service.create(mockCreateLogDto);

      expect(model).toHaveBeenCalledWith(mockCreateLogDto);
      expect(mockLog.save).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os logs para usuário admin', async () => {
      const mockLogs = [mockLog];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLogs),
      };
      
      (model.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await service.findAll(mockAdminUser);

      expect(model.find).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ data: -1 });
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });

    it('deve lançar ForbiddenException para usuário não-admin', async () => {
      await expect(service.findAll(mockRegularUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(model.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar log para usuário admin', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockLog),
      };
      
      (model.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await service.findOne('mockId', mockAdminUser);

      expect(model.findById).toHaveBeenCalledWith('mockId');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
    });

    it('deve lançar ForbiddenException para usuário não-admin', async () => {
      await expect(service.findOne('mockId', mockRegularUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(model.findById).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando log não for encontrado', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };
      
      (model.findById as jest.Mock).mockReturnValue(mockQuery);

      await expect(service.findOne('nonexistent', mockAdminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});