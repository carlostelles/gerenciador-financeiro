import { Test, TestingModule } from '@nestjs/testing';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { CategoriasService } from './categorias.service';
import { Categoria } from './entities/categoria.entity';
import { LogsService } from '../logs/logs.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { CategoriaTipo } from '../../common/types';

describe('CategoriasService', () => {
  let service: CategoriasService;
  let repository: jest.Mocked<Repository<Categoria>>;
  let logsService: jest.Mocked<LogsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Categoria>>;

  const mockCategoria = {
    id: 1,
    usuarioId: 1,
    nome: 'Test Category',
    descricao: 'Test Description',
    tipo: CategoriaTipo.RECEITA,
    createdAt: new Date(),
    updatedAt: new Date(),
    usuario: null,
    orcamentoItems: [],
    reservas: [],
  } as Categoria;

  const mockCreateCategoriaDto: CreateCategoriaDto = {
    nome: 'Test Category',
    descricao: 'Test Description',
    tipo: CategoriaTipo.RECEITA,
  };

  const mockCurrentUser = {
    sub: 1,
    email: 'user@example.com',
  };

  beforeEach(async () => {
    // Mock para o query builder
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    } as any;

    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const mockLogsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: getRepositoryToken(Categoria),
          useValue: mockRepository,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
    repository = module.get(getRepositoryToken(Categoria));
    logsService = module.get(LogsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar nova categoria com sucesso', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockCategoria);
      repository.save.mockResolvedValue(mockCategoria);
      logsService.create.mockResolvedValue(undefined);

      const result = await service.create(mockCreateCategoriaDto, mockCurrentUser);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          usuarioId: mockCurrentUser.sub,
          nome: mockCreateCategoriaDto.nome,
          tipo: mockCreateCategoriaDto.tipo,
        },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateCategoriaDto,
        usuarioId: mockCurrentUser.sub,
      });
      expect(repository.save).toHaveBeenCalledWith(mockCategoria);
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(mockCategoria);
    });

    it('deve lançar ConflictException quando categoria já existir', async () => {
      repository.findOne.mockResolvedValue(mockCategoria);

      await expect(
        service.create(mockCreateCategoriaDto, mockCurrentUser),
      ).rejects.toThrow(ConflictException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          usuarioId: mockCurrentUser.sub,
          nome: mockCreateCategoriaDto.nome,
          tipo: mockCreateCategoriaDto.tipo,
        },
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as categorias para usuário', async () => {
      const mockCategorias = [mockCategoria];
      repository.find.mockResolvedValue(mockCategorias);

      const result = await service.findAll(mockCurrentUser);

      expect(repository.find).toHaveBeenCalledWith({
        where: { usuarioId: mockCurrentUser.sub },
        order: { nome: 'ASC' },
      });
      expect(result).toEqual(mockCategorias);
    });
  });

  describe('findOne', () => {
    it('deve retornar categoria quando encontrada', async () => {
      repository.findOne.mockResolvedValue(mockCategoria);

      const result = await service.findOne(1, mockCurrentUser);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuarioId: mockCurrentUser.sub },
      });
      expect(result).toEqual(mockCategoria);
    });

    it('deve lançar NotFoundException quando categoria não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const mockUpdateDto: UpdateCategoriaDto = {
      nome: 'Updated Category',
    };

    it('deve atualizar categoria com sucesso', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockCategoria) // findOne call
        .mockResolvedValueOnce(null) // check for existing category
        .mockResolvedValueOnce({ ...mockCategoria, nome: 'Updated Category' }); // final findOne
      repository.update.mockResolvedValue(undefined);
      logsService.create.mockResolvedValue(undefined);

      const result = await service.update(1, mockUpdateDto, mockCurrentUser);

      expect(repository.update).toHaveBeenCalledWith(1, mockUpdateDto);
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual({ ...mockCategoria, nome: 'Updated Category' });
    });

    it('deve lançar NotFoundException quando categoria não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, mockUpdateDto, mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve remover categoria com sucesso quando não estiver em uso', async () => {
      repository.findOne.mockResolvedValue(mockCategoria);
      queryBuilder.getCount.mockResolvedValue(0);
      repository.remove.mockResolvedValue(undefined);
      logsService.create.mockResolvedValue(undefined);

      await service.remove(1, mockCurrentUser);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('categoria');
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith('categoria.orcamentoItems', 'orcamentoItems');
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith('categoria.reservas', 'reservas');
      expect(queryBuilder.where).toHaveBeenCalledWith('categoria.id = :id', { id: 1 });
      expect(queryBuilder.getCount).toHaveBeenCalled();
      expect(repository.remove).toHaveBeenCalledWith(mockCategoria);
      expect(logsService.create).toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando categoria estiver em uso', async () => {
      repository.findOne.mockResolvedValue(mockCategoria);
      queryBuilder.getCount.mockResolvedValue(1);

      await expect(service.remove(1, mockCurrentUser)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando categoria não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
