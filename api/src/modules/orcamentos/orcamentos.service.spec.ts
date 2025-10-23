import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { OrcamentosService } from './orcamentos.service';
import { Orcamento } from './entities/orcamento.entity';
import { OrcamentoItem } from './entities/orcamento-item.entity';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { CreateOrcamentoItemDto } from './dto/create-orcamento-item.dto';
import { Categoria } from '../categorias/entities/categoria.entity';

describe('OrcamentosService', () => {
  let service: OrcamentosService;
  let orcamentoRepository: jest.Mocked<Repository<Orcamento>>;
  let orcamentoItemRepository: jest.Mocked<Repository<OrcamentoItem>>;

  const mockOrcamento = {
    id: 1,
    usuarioId: 1,
    periodo: '2024-01',
    descricao: 'Test orcamento',
    createdAt: new Date(),
    updatedAt: new Date(),
    usuario: null,
    items: [],
  } as Orcamento;

  const mockCategoria = {
    id: 1,
    usuarioId: 1,
    nome: 'Alimentação',
    descricao: 'Despesas com alimentação',
    tipo: 'DESPESA',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Categoria;

  const mockOrcamentoItem = {
    id: 1,
    orcamentoId: 1,
    categoriaId: 1,
    descricao: 'Test item',
    valor: 1000.00,
    createdAt: new Date(),
    updatedAt: new Date(),
    orcamento: null,
    categoria: mockCategoria,
    movimentos: [],
  } as OrcamentoItem;

  const mockCreateOrcamentoDto: CreateOrcamentoDto = {
    periodo: '2024-01',
    descricao: 'Test orcamento',
  };

  const mockUpdateOrcamentoDto: UpdateOrcamentoDto = {
    descricao: 'Updated orcamento',
  };

  const mockCreateItemDto: CreateOrcamentoItemDto = {
    categoriaId: 1,
    descricao: 'Test item',
    valor: 1000.00,
  };

  const usuarioId = 1;

  beforeEach(async () => {
    const mockOrcamentoRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockOrcamentoItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrcamentosService,
        {
          provide: getRepositoryToken(Orcamento),
          useValue: mockOrcamentoRepository,
        },
        {
          provide: getRepositoryToken(OrcamentoItem),
          useValue: mockOrcamentoItemRepository,
        },
      ],
    }).compile();

    service = module.get<OrcamentosService>(OrcamentosService);
    orcamentoRepository = module.get(getRepositoryToken(Orcamento));
    orcamentoItemRepository = module.get(getRepositoryToken(OrcamentoItem));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo orçamento com sucesso', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);
      orcamentoRepository.create.mockReturnValue(mockOrcamento);
      orcamentoRepository.save.mockResolvedValue(mockOrcamento);

      const result = await service.create(mockCreateOrcamentoDto, usuarioId);

      expect(orcamentoRepository.findOne).toHaveBeenCalledWith({
        where: { periodo: mockCreateOrcamentoDto.periodo, usuarioId },
      });
      expect(orcamentoRepository.create).toHaveBeenCalledWith({
        ...mockCreateOrcamentoDto,
        usuarioId,
      });
      expect(orcamentoRepository.save).toHaveBeenCalledWith(mockOrcamento);
      expect(result).toEqual(mockOrcamento);
    });

    it('deve lançar ConflictException quando orçamento já existir para período', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);

      await expect(
        service.create(mockCreateOrcamentoDto, usuarioId),
      ).rejects.toThrow(ConflictException);
      expect(orcamentoRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os orçamentos para usuário', async () => {
      const mockOrcamentos = [mockOrcamento];
      orcamentoRepository.find.mockResolvedValue(mockOrcamentos);

      const result = await service.findAll(usuarioId);

      expect(orcamentoRepository.find).toHaveBeenCalledWith({
        where: { usuarioId },
        relations: ['items'],
        order: { periodo: 'DESC' },
      });
      expect(result).toEqual(mockOrcamentos);
    });
  });

  describe('findPeriodos', () => {
    it('deve retornar lista de períodos para usuário', async () => {
      const mockOrcamentos = [
        { periodo: '2024-01' },
        { periodo: '2024-02' },
        { periodo: '2024-03' },
      ];
      orcamentoRepository.find.mockResolvedValue(mockOrcamentos as Orcamento[]);

      const result = await service.findPeriodos(usuarioId);

      expect(orcamentoRepository.find).toHaveBeenCalledWith({
        where: { usuarioId },
        select: ['periodo'],
        order: { periodo: 'DESC' },
      });
      expect(result).toEqual(['2024-01', '2024-02', '2024-03']);
    });

    it('deve retornar array vazio quando não houver orçamentos', async () => {
      orcamentoRepository.find.mockResolvedValue([]);

      const result = await service.findPeriodos(usuarioId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('deve retornar orçamento quando encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);

      const result = await service.findOne(1, usuarioId);

      expect(orcamentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuarioId },
        relations: ['items', 'items.categoria'],
      });
      expect(result).toEqual(mockOrcamento);
    });

    it('deve lançar NotFoundException quando orçamento não for encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar orçamento com sucesso', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      const updatedOrcamento = { ...mockOrcamento, ...mockUpdateOrcamentoDto };
      orcamentoRepository.save.mockResolvedValue(updatedOrcamento as Orcamento);

      const result = await service.update(1, mockUpdateOrcamentoDto, usuarioId);

      expect(orcamentoRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedOrcamento);
    });

    it('deve lançar NotFoundException quando orçamento não for encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, mockUpdateOrcamentoDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve remover orçamento com sucesso quando não há itens', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      orcamentoRepository.remove.mockResolvedValue(undefined);

      await service.remove(1, usuarioId);

      expect(orcamentoRepository.remove).toHaveBeenCalledWith(mockOrcamento);
    });

    it('deve lançar ConflictException quando orçamento tiver itens', async () => {
      const orcamentoWithItems = { ...mockOrcamento, items: [mockOrcamentoItem] };
      orcamentoRepository.findOne.mockResolvedValue(orcamentoWithItems);

      await expect(service.remove(1, usuarioId)).rejects.toThrow(
        ConflictException,
      );
      expect(orcamentoRepository.remove).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando orçamento não for encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createItem', () => {
    it('deve criar novo item de orçamento com sucesso', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      orcamentoItemRepository.create.mockReturnValue(mockOrcamentoItem);
      orcamentoItemRepository.save.mockResolvedValue(mockOrcamentoItem);

      const result = await service.createItem(1, mockCreateItemDto, usuarioId);

      expect(orcamentoItemRepository.create).toHaveBeenCalledWith({
        ...mockCreateItemDto,
        orcamentoId: 1,
      });
      expect(orcamentoItemRepository.save).toHaveBeenCalledWith(mockOrcamentoItem);
      expect(result).toEqual(mockOrcamentoItem);
    });

    it('deve lançar NotFoundException quando orçamento não for encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createItem(1, mockCreateItemDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findItems', () => {
    it('deve retornar todos os itens para orçamento', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      const mockItems = [mockOrcamentoItem];
      orcamentoItemRepository.find.mockResolvedValue(mockItems);

      const result = await service.findItems(1, usuarioId);

      expect(orcamentoItemRepository.find).toHaveBeenCalledWith({
        where: { orcamentoId: 1 },
        relations: ['categoria'],
      });
      expect(result).toEqual(mockItems);
    });
  });

  describe('findItem', () => {
    it('deve retornar item quando encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      orcamentoItemRepository.findOne.mockResolvedValue(mockOrcamentoItem);

      const result = await service.findItem(1, 1, usuarioId);

      expect(orcamentoItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, orcamentoId: 1 },
        relations: ['categoria'],
      });
      expect(result).toEqual(mockOrcamentoItem);
    });

    it('deve lançar NotFoundException quando item não for encontrado', async () => {
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamento);
      orcamentoItemRepository.findOne.mockResolvedValue(null);

      await expect(service.findItem(1, 1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByPeriodo', () => {
    it('deve retornar orçamento com itens e categorias quando encontrado', async () => {
      const mockOrcamentoWithItems = {
        ...mockOrcamento,
        items: [mockOrcamentoItem],
      };
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamentoWithItems);

      const result = await service.findByPeriodo('2024-01', usuarioId);

      expect(orcamentoRepository.findOne).toHaveBeenCalledWith({
        where: { periodo: '2024-01', usuarioId },
        relations: ['items', 'items.categoria'],
      });
      expect(result).toEqual({
        id: mockOrcamento.id,
        periodo: mockOrcamento.periodo,
        descricao: mockOrcamento.descricao,
        createdAt: mockOrcamento.createdAt,
        updatedAt: mockOrcamento.updatedAt,
        items: [
          {
            id: mockOrcamentoItem.id,
            descricao: mockOrcamentoItem.descricao,
            valor: mockOrcamentoItem.valor,
            categoria: {
              id: mockCategoria.id,
              nome: mockCategoria.nome,
              tipo: mockCategoria.tipo,
            },
          },
        ],
      });
    });

    it('deve retornar orçamento com array vazio de itens quando não houver itens', async () => {
      const mockOrcamentoWithoutItems = {
        ...mockOrcamento,
        items: [],
      };
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamentoWithoutItems);

      const result = await service.findByPeriodo('2024-01', usuarioId);

      expect(result.items).toEqual([]);
      expect(result.id).toEqual(mockOrcamento.id);
      expect(result.periodo).toEqual(mockOrcamento.periodo);
    });

    it('deve retornar apenas id e descricao da categoria', async () => {
      const mockOrcamentoWithItems = {
        ...mockOrcamento,
        items: [mockOrcamentoItem],
      };
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamentoWithItems);

      const result = await service.findByPeriodo('2024-01', usuarioId);

      expect(result.items[0].categoria).toHaveProperty('id');
      expect(result.items[0].categoria).toHaveProperty('nome');
      expect(result.items[0].categoria).toHaveProperty('tipo');
      expect(result.items[0].categoria).not.toHaveProperty('descricao');
      expect(result.items[0].categoria).not.toHaveProperty('usuarioId');
    });

    it('deve lançar NotFoundException quando orçamento não for encontrado para o período', async () => {
      orcamentoRepository.findOne.mockResolvedValue(null);

      await expect(service.findByPeriodo('2024-01', usuarioId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByPeriodo('2024-01', usuarioId)).rejects.toThrow(
        'Orçamento não encontrado para o período 2024-01',
      );
    });

    it('deve buscar orçamento apenas do usuário autenticado', async () => {
      const mockOrcamentoWithItems = {
        ...mockOrcamento,
        items: [mockOrcamentoItem],
      };
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamentoWithItems);

      await service.findByPeriodo('2024-01', usuarioId);

      expect(orcamentoRepository.findOne).toHaveBeenCalledWith({
        where: { periodo: '2024-01', usuarioId },
        relations: ['items', 'items.categoria'],
      });
    });

    it('deve retornar múltiplos itens com suas respectivas categorias', async () => {
      const mockCategoria2 = {
        ...mockCategoria,
        id: 2,
        nome: 'Transporte',
        descricao: 'Despesas com transporte',
      } as Categoria;

      const mockOrcamentoItem2 = {
        ...mockOrcamentoItem,
        id: 2,
        descricao: 'Combustível',
        valor: 300.00,
        categoriaId: 2,
        categoria: mockCategoria2,
      } as OrcamentoItem;

      const mockOrcamentoWithMultipleItems = {
        ...mockOrcamento,
        items: [mockOrcamentoItem, mockOrcamentoItem2],
      };
      orcamentoRepository.findOne.mockResolvedValue(mockOrcamentoWithMultipleItems);

      const result = await service.findByPeriodo('2024-01', usuarioId);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].categoria.id).toBe(1);
      expect(result.items[0].categoria.nome).toBe('Alimentação');
      expect(result.items[1].categoria.id).toBe(2);
      expect(result.items[1].categoria.nome).toBe('Transporte');
    });
  });
});
