import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MovimentacoesService } from './movimentacoes.service';
import { Movimento } from './entities/movimento.entity';
import { MovimentoComprovante } from './entities/movimento-comprovante.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { OrcamentoItem } from '../orcamentos/entities/orcamento-item.entity';
import { Orcamento } from '../orcamentos/entities/orcamento.entity';
import { Conta } from '../contas/entities/conta.entity';
import { LogsService } from '../logs/logs.service';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';
import { MovimentoComprovanteAiService } from './services/movimento-comprovante-ai.service';
import { MovimentoComprovanteStorageService } from './services/movimento-comprovante-storage.service';

describe('MovimentacoesService', () => {
  let service: MovimentacoesService;
  let movimentoRepository: jest.Mocked<Repository<Movimento>>;
  let comprovanteRepository: jest.Mocked<Repository<MovimentoComprovante>>;
  let categoriaRepository: jest.Mocked<Repository<Categoria>>;
  let orcamentoItemRepository: jest.Mocked<Repository<OrcamentoItem>>;
  let contaRepository: jest.Mocked<Repository<Conta>>;
  let logsService: { create: jest.Mock };
  let comprovanteStorageService: { uploadComprovante: jest.Mock };
  let comprovanteAiService: { analisarComprovante: jest.Mock };

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
    categoria: null,
    conta: null,
    comprovante: null,
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
    const mockMovimentoRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockCategoriaRepository = {
      find: jest.fn(),
    };

    const mockComprovanteRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockOrcamentoItemRepository = {
      findOne: jest.fn(),
    };

    const mockOrcamentoRepository = {
      findOne: jest.fn(),
    };

    const mockContaRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockLogsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MOVIMENTO_COMPROVANTE_MAX_SIZE_BYTES') {
          return 10 * 1024 * 1024;
        }
        return undefined;
      }),
    };

    const mockComprovanteStorageService = {
      uploadComprovante: jest.fn(),
    };

    const mockComprovanteAiService = {
      analisarComprovante: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimentacoesService,
        {
          provide: getRepositoryToken(Movimento),
          useValue: mockMovimentoRepository,
        },
        {
          provide: getRepositoryToken(Categoria),
          useValue: mockCategoriaRepository,
        },
        {
          provide: getRepositoryToken(MovimentoComprovante),
          useValue: mockComprovanteRepository,
        },
        {
          provide: getRepositoryToken(OrcamentoItem),
          useValue: mockOrcamentoItemRepository,
        },
        {
          provide: getRepositoryToken(Orcamento),
          useValue: mockOrcamentoRepository,
        },
        {
          provide: getRepositoryToken(Conta),
          useValue: mockContaRepository,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MovimentoComprovanteStorageService,
          useValue: mockComprovanteStorageService,
        },
        {
          provide: MovimentoComprovanteAiService,
          useValue: mockComprovanteAiService,
        },
      ],
    }).compile();

    service = module.get<MovimentacoesService>(MovimentacoesService);
    movimentoRepository = module.get(getRepositoryToken(Movimento));
    comprovanteRepository = module.get(getRepositoryToken(MovimentoComprovante));
    categoriaRepository = module.get(getRepositoryToken(Categoria));
    orcamentoItemRepository = module.get(getRepositoryToken(OrcamentoItem));
    contaRepository = module.get(getRepositoryToken(Conta));
    logsService = module.get(LogsService);
    comprovanteStorageService = module.get(MovimentoComprovanteStorageService);
    comprovanteAiService = module.get(MovimentoComprovanteAiService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo movimento com sucesso', async () => {
      const movimentoComCategoria = { ...mockMovimento, categoriaId: 10 } as Movimento;
      orcamentoItemRepository.findOne.mockResolvedValue({
        id: 1,
        categoriaId: 10,
      } as OrcamentoItem);
      movimentoRepository.create.mockReturnValue(movimentoComCategoria);
      movimentoRepository.save.mockResolvedValue(movimentoComCategoria);
      movimentoRepository.findOne.mockResolvedValue(movimentoComCategoria);

      const result = await service.create(periodo, mockCreateMovimentoDto, usuarioId);

      expect(movimentoRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        periodo: '2024-01',
        usuarioId,
        categoriaId: 10,
      }));
      expect(movimentoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Date) }),
      );
      expect(movimentoRepository.save).toHaveBeenCalledWith(movimentoComCategoria);
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(movimentoComCategoria);
    });

    it('deve vincular comprovante ao primeiro movimento criado', async () => {
      const movimentoComCategoria = { ...mockMovimento, id: 99, categoriaId: 10 } as Movimento;
      orcamentoItemRepository.findOne.mockResolvedValue({
        id: 1,
        categoriaId: 10,
      } as OrcamentoItem);
      movimentoRepository.create.mockReturnValue(movimentoComCategoria);
      movimentoRepository.save.mockResolvedValue(movimentoComCategoria);
      movimentoRepository.findOne.mockResolvedValue(movimentoComCategoria);
      comprovanteRepository.findOne.mockResolvedValue({
        id: 33,
        usuarioId,
        movimentoId: null,
      } as MovimentoComprovante);
      comprovanteRepository.save.mockResolvedValue({
        id: 33,
        usuarioId,
        movimentoId: 99,
      } as MovimentoComprovante);

      await service.create(periodo, {
        ...mockCreateMovimentoDto,
        comprovanteId: 33,
      }, usuarioId);

      expect(comprovanteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 33, usuarioId },
      });
      expect(comprovanteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ movimentoId: 99 }),
      );
    });

    it('deve lançar BadRequestException quando data estiver fora do período', async () => {
      const invalidDto = {
        ...mockCreateMovimentoDto,
        data: '2024-02-15', // Different month
      };

      await expect(
        service.create(periodo, invalidDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(movimentoRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando ano for diferente', async () => {
      const invalidDto = {
        ...mockCreateMovimentoDto,
        data: '2023-01-15', // Different year
      };

      await expect(
        service.create(periodo, invalidDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(movimentoRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('analisarComprovante', () => {
    const arquivo = {
      originalname: 'comprovante.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('fake-pdf'),
    };

    it('deve analisar comprovante e retornar sugestão preenchida', async () => {
      categoriaRepository.find.mockResolvedValue([
        { id: 7, usuarioId, nome: 'Alimentação', tipo: 'DESPESA' } as Categoria,
      ]);
      contaRepository.find.mockResolvedValue([
        { id: 2, usuarioId, nome: 'Conta Corrente' } as Conta,
      ]);
      comprovanteStorageService.uploadComprovante.mockResolvedValue({
        bucket: 'bucket-teste',
        key: 'movimentacoes/1/2026/07/arquivo.pdf',
        caminhoArquivo: 's3://bucket-teste/movimentacoes/1/2026/07/arquivo.pdf',
      });
      comprovanteAiService.analisarComprovante.mockResolvedValue({
        data: '2026-07-13',
        periodo: '2026-07',
        valor: 123.45,
        descricao: 'Pagamento via PIX',
        categoriaId: 7,
        contaId: 2,
      });
      comprovanteRepository.create.mockImplementation((payload) => payload as any);
      comprovanteRepository.save.mockResolvedValue({
        id: 10,
        usuarioId,
        movimentoId: null,
        caminhoArquivo: 's3://bucket-teste/movimentacoes/1/2026/07/arquivo.pdf',
        nomeArquivo: 'comprovante.pdf',
        tipoArquivo: 'application/pdf',
        tamanhoArquivo: 2048,
      } as MovimentoComprovante);

      const result = await service.analisarComprovante(arquivo as any, usuarioId);

      expect(comprovanteStorageService.uploadComprovante).toHaveBeenCalledWith(usuarioId, arquivo);
      expect(comprovanteAiService.analisarComprovante).toHaveBeenCalled();
      expect(result.sugestao.data).toBe('2026-07-13');
      expect(result.sugestao.categoriaId).toBe(7);
      expect(result.sugestao.contaId).toBe(2);
      expect(result.camposObrigatoriosFaltantes).toEqual([]);
    });

    it('deve rejeitar arquivo com tipo não suportado', async () => {
      await expect(
        service.analisarComprovante({ ...arquivo, mimetype: 'text/plain' } as any, usuarioId),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os movimentos para período e usuário', async () => {
      const mockMovimentos = [mockMovimento];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMovimentos),
      };
      movimentoRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll(periodo, usuarioId);

      expect(movimentoRepository.createQueryBuilder).toHaveBeenCalledWith('movimento');
      expect(qb.getMany).toHaveBeenCalled();
      expect(result).toEqual(mockMovimentos);
    });
  });

  describe('findOne', () => {
    it('deve retornar movimento quando encontrado', async () => {
      movimentoRepository.findOne.mockResolvedValue(mockMovimento);

      const result = await service.findOne(periodo, 1, usuarioId);

      expect(movimentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria', 'conta', 'comprovante'],
      });
      expect(result).toEqual(mockMovimento);
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      movimentoRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(periodo, 1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar movimento com sucesso', async () => {
      movimentoRepository.findOne.mockResolvedValue(mockMovimento);
      const updatedMovimento = { ...mockMovimento, ...mockUpdateMovimentoDto };
      movimentoRepository.save.mockResolvedValue(updatedMovimento as Movimento);

      const result = await service.update(periodo, 1, mockUpdateMovimentoDto, usuarioId);

      expect(movimentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria', 'conta', 'comprovante'],
      });
      expect(movimentoRepository.save).toHaveBeenCalled();
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(updatedMovimento);
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      movimentoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(periodo, 1, mockUpdateMovimentoDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando nova data estiver fora do período', async () => {
      movimentoRepository.findOne.mockResolvedValue(mockMovimento);
      const invalidUpdateDto = {
        ...mockUpdateMovimentoDto,
        data: '2024-02-15', // Different month
      };

      await expect(
        service.update(periodo, 1, invalidUpdateDto, usuarioId),
      ).rejects.toThrow(BadRequestException);
      expect(movimentoRepository.save).not.toHaveBeenCalled();
    });

    it('deve atualizar contaId sem manter relação antiga de conta', async () => {
      const movimentoComContaAntiga = {
        ...mockMovimento,
        contaId: 1,
        conta: { id: 1, nome: 'Conta antiga' },
      } as unknown as Movimento;

      movimentoRepository.findOne.mockResolvedValue(movimentoComContaAntiga);
      contaRepository.findOne.mockResolvedValue({ id: 2 } as Conta);
      movimentoRepository.save.mockImplementation(async (payload) => payload as Movimento);

      await service.update(
        periodo,
        1,
        { contaId: 2 },
        usuarioId,
      );

      expect(movimentoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ contaId: 2 }),
      );
      expect(movimentoRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ conta: expect.anything() }),
      );
    });
  });

  describe('remove', () => {
    it('deve remover movimento com sucesso', async () => {
      movimentoRepository.findOne.mockResolvedValue(mockMovimento);
      movimentoRepository.remove.mockResolvedValue(undefined as any);

      await service.remove(periodo, 1, usuarioId);

      expect(movimentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria', 'conta', 'comprovante'],
      });
      expect(movimentoRepository.remove).toHaveBeenCalledWith(mockMovimento);
      expect(logsService.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando movimento não for encontrado', async () => {
      movimentoRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(periodo, 1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
      expect(movimentoRepository.remove).not.toHaveBeenCalled();
    });
  });
});