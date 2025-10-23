import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { MovimentacoesService } from './movimentacoes.service';
import { Movimento } from './entities/movimento.entity';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';

describe('MovimentacoesService', () => {
  let service: MovimentacoesService;
  let repository: jest.Mocked<Repository<Movimento>>;

  const mockMovimento = {
    id: 1,
    usuarioId: 1,
    periodo: '2024-01',
    data: new Date('2024-01-15'),
    descricao: 'Test movimento',
    valor: 100.50,
    orcamentoItemId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    usuario: null,
    orcamentoItem: null,
  } as Movimento;

  const mockCreateMovimentoDto: CreateMovimentoDto = {
    data: '2024-01-15',
    descricao: 'Test movimento',
    valor: 100.50,
    orcamentoItemId: 1,
  };

  const mockUpdateMovimentoDto: UpdateMovimentoDto = {
    descricao: 'Updated movimento',
    valor: 200.00,
  };

  const usuarioId = 1;
  const periodo = '2024-01';

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimentacoesService,
        {
          provide: getRepositoryToken(Movimento),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MovimentacoesService>(MovimentacoesService);
    repository = module.get(getRepositoryToken(Movimento));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo movimento com sucesso', async () => {
      repository.create.mockReturnValue(mockMovimento);
      repository.save.mockResolvedValue(mockMovimento);

      const result = await service.create(periodo, mockCreateMovimentoDto, usuarioId);

      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateMovimentoDto,
        periodo,
        usuarioId,
      });
      expect(repository.save).toHaveBeenCalledWith(mockMovimento);
      expect(result).toEqual(mockMovimento);
    });

    it('deve lançar BadRequestException quando data estiver fora do período', async () => {
      const invalidDto = {
        ...mockCreateMovimentoDto,
        data: '2024-02-15', // Different month
      };

      await expect(
        service.create(periodo, invalidDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando ano for diferente', async () => {
      const invalidDto = {
        ...mockCreateMovimentoDto,
        data: '2023-01-15', // Different year
      };

      await expect(
        service.create(periodo, invalidDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os movimentos para período e usuário', async () => {
      const mockMovimentos = [mockMovimento];
      repository.find.mockResolvedValue(mockMovimentos);

      const result = await service.findAll(periodo, usuarioId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria'],
        order: { data: 'DESC' },
      });
      expect(result).toEqual(mockMovimentos);
    });
  });

  describe('findOne', () => {
    it('deve retornar movimento quando encontrado', async () => {
      repository.findOne.mockResolvedValue(mockMovimento);

      const result = await service.findOne(periodo, 1, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria'],
      });
      expect(result).toEqual(mockMovimento);
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(periodo, 1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar movimento com sucesso', async () => {
      repository.findOne.mockResolvedValue(mockMovimento);
      const updatedMovimento = { ...mockMovimento, ...mockUpdateMovimentoDto };
      repository.save.mockResolvedValue(updatedMovimento as Movimento);

      const result = await service.update(periodo, 1, mockUpdateMovimentoDto, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria'],
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedMovimento);
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(periodo, 1, mockUpdateMovimentoDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando nova data estiver fora do período', async () => {
      repository.findOne.mockResolvedValue(mockMovimento);
      const invalidUpdateDto = {
        ...mockUpdateMovimentoDto,
        data: '2024-02-15', // Different month
      };

      await expect(
        service.update(periodo, 1, invalidUpdateDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover movimento com sucesso', async () => {
      repository.findOne.mockResolvedValue(mockMovimento);
      repository.remove.mockResolvedValue(undefined);

      await service.remove(periodo, 1, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria'],
      });
      expect(repository.remove).toHaveBeenCalledWith(mockMovimento);
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(periodo, 1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});