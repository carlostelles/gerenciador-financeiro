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
import {
  SaldoInicial,
  SaldoInicialOrigem,
} from './entities/saldo-inicial.entity';

describe('MovimentacoesService', () => {
  let service: MovimentacoesService;
  let movimentoRepository: jest.Mocked<Repository<Movimento>>;
  let comprovanteRepository: jest.Mocked<Repository<MovimentoComprovante>>;
  let categoriaRepository: jest.Mocked<Repository<Categoria>>;
  let orcamentoItemRepository: jest.Mocked<Repository<OrcamentoItem>>;
  let contaRepository: jest.Mocked<Repository<Conta>>;
  let saldoInicialRepository: jest.Mocked<Repository<SaldoInicial>>;
  let logsService: { create: jest.Mock };
  let comprovanteStorageService: { uploadComprovante: jest.Mock };
  let comprovanteAiService: { analisarComprovante: jest.Mock };

  const mockMovimento = {
    id: 1,
    usuarioId: 1,
    periodo: '2024-01',
    data: new Date('2024-01-15'),
    descricao: 'Test movimento',
    valor: 100.5,
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
    valor: 100.5,
    orcamentoItemId: 1,
    categoriaId: 10,
  };

  const mockUpdateMovimentoDto: UpdateMovimentoDto = {
    descricao: 'Updated movimento',
    valor: 200.0,
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
      findOne: jest.fn().mockResolvedValue({
        id: 7,
        usuarioId,
        nome: 'Conta Corrente',
      } as Conta),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockSaldoInicialRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
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
          provide: getRepositoryToken(SaldoInicial),
          useValue: mockSaldoInicialRepository,
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
    comprovanteRepository = module.get(
      getRepositoryToken(MovimentoComprovante),
    );
    categoriaRepository = module.get(getRepositoryToken(Categoria));
    orcamentoItemRepository = module.get(getRepositoryToken(OrcamentoItem));
    contaRepository = module.get(getRepositoryToken(Conta));
    saldoInicialRepository = module.get(getRepositoryToken(SaldoInicial));
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
      const movimentoComCategoria = {
        ...mockMovimento,
        categoriaId: 10,
      } as Movimento;
      orcamentoItemRepository.findOne.mockResolvedValue({
        id: 1,
        categoriaId: 10,
      } as OrcamentoItem);
      movimentoRepository.create.mockReturnValue(movimentoComCategoria);
      movimentoRepository.save.mockResolvedValue(movimentoComCategoria);
      movimentoRepository.findOne.mockResolvedValue(movimentoComCategoria);

      const result = await service.create(
        periodo,
        mockCreateMovimentoDto,
        usuarioId,
      );

      expect(movimentoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          periodo: '2024-01',
          usuarioId,
          categoriaId: 10,
        }),
      );
      expect(movimentoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Date) }),
      );
      expect(movimentoRepository.save).toHaveBeenCalledWith(
        movimentoComCategoria,
      );
      expect(logsService.create).toHaveBeenCalled();
      expect(result).toEqual(movimentoComCategoria);
    });

    it('deve vincular comprovante ao primeiro movimento criado', async () => {
      const movimentoComCategoria = {
        ...mockMovimento,
        id: 99,
        categoriaId: 10,
      } as Movimento;
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

      await service.create(
        periodo,
        {
          ...mockCreateMovimentoDto,
          comprovanteId: 33,
        },
        usuarioId,
      );

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
      comprovanteRepository.create.mockImplementation(
        (payload) => payload as any,
      );
      comprovanteRepository.save.mockResolvedValue({
        id: 10,
        usuarioId,
        movimentoId: null,
        caminhoArquivo: 's3://bucket-teste/movimentacoes/1/2026/07/arquivo.pdf',
        nomeArquivo: 'comprovante.pdf',
        tipoArquivo: 'application/pdf',
        tamanhoArquivo: 2048,
      } as MovimentoComprovante);
      comprovanteRepository.findOne.mockResolvedValue({
        id: 10,
        usuarioId,
        movimentoId: null,
      } as MovimentoComprovante);
      contaRepository.findOne.mockResolvedValue({
        id: 2,
        usuarioId,
        nome: 'Conta Corrente',
      } as Conta);
      movimentoRepository.create.mockImplementation(
        (payload) => payload as any,
      );
      movimentoRepository.save.mockResolvedValue({
        id: 88,
        usuarioId,
        periodo: '2026-07',
        data: new Date('2026-07-13'),
        descricao: 'Pagamento via PIX',
        valor: 123.45,
        categoriaId: 7,
      } as Movimento);
      movimentoRepository.findOne.mockResolvedValue({
        id: 88,
        usuarioId,
        periodo: '2026-07',
        data: '2026-07-13',
        descricao: 'Pagamento via PIX',
        valor: 123.45,
        categoriaId: 7,
      } as unknown as Movimento);

      const result = await service.analisarComprovante(
        arquivo as any,
        usuarioId,
      );

      expect(comprovanteStorageService.uploadComprovante).toHaveBeenCalledWith(
        usuarioId,
        arquivo,
      );
      expect(comprovanteAiService.analisarComprovante).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.body.sugestao.data).toBe('2026-07-13');
      expect(result.body.sugestao.categoriaId).toBe(7);
      expect(result.body.sugestao.contaId).toBe(2);
      expect(result.body.camposObrigatoriosFaltantes).toEqual([]);
      expect(result.body.salvamento).toEqual({
        status: 'criado',
        movimentoId: 88,
      });
    });

    it('deve criar movimento parcial não revisado quando faltar campo obrigatório', async () => {
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
        data: null,
        periodo: null,
        valor: 123.45,
        descricao: 'Pagamento via PIX',
        categoriaId: 7,
        contaId: 2,
      });
      comprovanteRepository.create.mockImplementation(
        (payload) => payload as any,
      );
      comprovanteRepository.save.mockResolvedValue({
        id: 10,
        usuarioId,
        movimentoId: null,
        caminhoArquivo: 's3://bucket-teste/movimentacoes/1/2026/07/arquivo.pdf',
        nomeArquivo: 'comprovante.pdf',
        tipoArquivo: 'application/pdf',
        tamanhoArquivo: 2048,
      } as MovimentoComprovante);
      comprovanteRepository.findOne.mockResolvedValue({
        id: 10,
        usuarioId,
        movimentoId: null,
      } as MovimentoComprovante);
      movimentoRepository.create.mockImplementation(
        (payload) => payload as any,
      );
      movimentoRepository.save.mockResolvedValue({
        id: 89,
        usuarioId,
        periodo: new Date().toISOString().slice(0, 7),
        data: null,
        descricao: 'Pagamento via PIX',
        valor: 123.45,
        categoriaId: 7,
        contaId: 2,
        revisado: false,
      } as Movimento);

      const result = await service.analisarComprovante(
        arquivo as any,
        usuarioId,
      );

      expect(result.statusCode).toBe(201);
      expect(result.body.camposObrigatoriosFaltantes).toContain('data');
      expect(result.body.salvamento).toEqual({
        status: 'criado',
        movimentoId: 89,
      });
      expect(movimentoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          valor: 123.45,
          categoriaId: 7,
          contaId: 2,
          revisado: false,
        }),
      );
    });

    it('deve rejeitar arquivo com tipo não suportado', async () => {
      await expect(
        service.analisarComprovante(
          { ...arquivo, mimetype: 'text/plain' } as any,
          usuarioId,
        ),
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

      expect(movimentoRepository.createQueryBuilder).toHaveBeenCalledWith(
        'movimento',
      );
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
        relations: [
          'orcamentoItem',
          'orcamentoItem.categoria',
          'categoria',
          'conta',
          'comprovante',
        ],
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

      const result = await service.update(
        periodo,
        1,
        mockUpdateMovimentoDto,
        usuarioId,
      );

      expect(movimentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: [
          'orcamentoItem',
          'orcamentoItem.categoria',
          'categoria',
          'conta',
          'comprovante',
        ],
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
      movimentoRepository.save.mockImplementation(
        async (payload) => payload as Movimento,
      );

      await service.update(periodo, 1, { contaId: 2 }, usuarioId);

      expect(movimentoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ contaId: 2 }),
      );
      expect(movimentoRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ conta: expect.anything() }),
      );
    });

    it('não deve marcar como revisada uma movimentação com campos obrigatórios ausentes', async () => {
      movimentoRepository.findOne.mockResolvedValue({
        ...mockMovimento,
        data: null,
        valor: null,
        categoriaId: null,
        orcamentoItemId: null,
      } as Movimento);

      await expect(
        service.update(periodo, 1, { revisado: true }, usuarioId),
      ).rejects.toThrow(
        'Preencha data, valor e categoria antes de marcar a movimentação como revisada',
      );
      expect(movimentoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('saldo inicial', () => {
    it('deve agregar os saldos iniciais de todas as contas do usuário', async () => {
      const queryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: '1',
            contaId: '7',
            contaNome: 'Conta Corrente',
            valor: '150.00',
            origem: SaldoInicialOrigem.MANUAL,
            criadoPorManual: 1,
          },
          {
            id: null,
            contaId: '8',
            contaNome: 'Carteira',
            valor: '-25.00',
            origem: null,
            criadoPorManual: null,
          },
        ]),
      };
      contaRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.getSaldosIniciais('2024-02', usuarioId),
      ).resolves.toEqual({
        periodo: '2024-02',
        valorTotal: 125,
        quantidadeContas: 2,
        saldos: [
          expect.objectContaining({
            contaId: 7,
            contaNome: 'Conta Corrente',
            valor: 150,
          }),
          expect.objectContaining({
            contaId: 8,
            contaNome: 'Carteira',
            valor: -25,
          }),
        ],
      });
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'conta.usuarioId = :usuarioId',
        { usuarioId },
      );
      expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
      expect(saldoInicialRepository.findOne).not.toHaveBeenCalled();
    });

    it('deve retornar agregado vazio quando o usuário não possui contas', async () => {
      const queryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      contaRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.getSaldosIniciais('2024-02', usuarioId),
      ).resolves.toEqual({
        periodo: '2024-02',
        valorTotal: 0,
        quantidadeContas: 0,
        saldos: [],
      });
    });

    it('deve rejeitar período inválido antes de executar o agregado', async () => {
      await expect(
        service.getSaldosIniciais('2024-13', usuarioId),
      ).rejects.toThrow('O período deve estar no formato YYYY-MM');
      expect(contaRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('deve incluir períodos que existem somente em saldos iniciais', async () => {
      movimentoRepository.find.mockResolvedValue([
        { periodo: '2024-03' },
        { periodo: '2024-02' },
      ] as Movimento[]);
      saldoInicialRepository.find.mockResolvedValue([
        { periodo: '2024-04' },
        { periodo: '2024-03' },
      ] as SaldoInicial[]);

      await expect(service.findPeriodos(usuarioId)).resolves.toEqual([
        '2024-04',
        '2024-03',
        '2024-02',
      ]);
      expect(saldoInicialRepository.find).toHaveBeenCalledWith({
        where: { usuarioId },
        select: { periodo: true },
      });
    });

    it('deve criar saldo inicial básico com valor informado', async () => {
      const saldoInicial = {
        id: 1,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: 150,
        origem: SaldoInicialOrigem.MANUAL,
        criadoPorManual: true,
      } as SaldoInicial;

      saldoInicialRepository.findOne.mockResolvedValue(null);
      saldoInicialRepository.create.mockReturnValue(saldoInicial);
      saldoInicialRepository.save.mockResolvedValue(saldoInicial);

      const result = await service.createSaldoInicial(
        '2024-02',
        { contaId: 7, valor: 150, origem: SaldoInicialOrigem.MANUAL },
        usuarioId,
      );

      expect(result).toEqual(saldoInicial);
      expect(saldoInicialRepository.save).toHaveBeenCalledWith(saldoInicial);
    });

    it('deve persistir saldo inicial manual negativo', async () => {
      saldoInicialRepository.findOne.mockResolvedValue(null);
      saldoInicialRepository.create.mockImplementation(
        (dados) => dados as SaldoInicial,
      );
      saldoInicialRepository.save.mockImplementation(
        async (saldo) => ({ ...saldo, id: 9 }) as SaldoInicial,
      );

      const result = await service.createSaldoInicial(
        '2024-02',
        { contaId: 7, valor: -150.75, origem: SaldoInicialOrigem.MANUAL },
        usuarioId,
      );

      expect(result.valor).toBe(-150.75);
      expect(saldoInicialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          valor: -150.75,
          origem: SaldoInicialOrigem.MANUAL,
        }),
      );
    });

    it('deve rejeitar período inválido antes de consultar a conta', async () => {
      await expect(
        service.createSaldoInicial(
          '2024-13',
          { contaId: 7, valor: 100, origem: SaldoInicialOrigem.MANUAL },
          usuarioId,
        ),
      ).rejects.toThrow('O período deve estar no formato YYYY-MM');
      expect(contaRepository.findOne).not.toHaveBeenCalled();
      expect(saldoInicialRepository.save).not.toHaveBeenCalled();
    });

    it('deve impedir duplicidade de saldo inicial por usuário e conta no mesmo período', async () => {
      saldoInicialRepository.findOne.mockResolvedValue({
        id: 88,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: 120,
        origem: SaldoInicialOrigem.AUTO,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SaldoInicial);
      saldoInicialRepository.save.mockResolvedValue({
        id: 88,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: 120,
        origem: SaldoInicialOrigem.AUTO,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SaldoInicial);

      await expect(
        service.createSaldoInicial(
          '2024-02',
          { contaId: 7, valor: 100, origem: SaldoInicialOrigem.AUTO },
          usuarioId,
        ),
      ).rejects.toThrow(
        'Saldo inicial já cadastrado para esta conta no período',
      );
    });

    it('deve calcular saldo inicial automaticamente com base no período anterior e movimentos', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '400.00' }),
      };
      saldoInicialRepository.findOne.mockResolvedValue(null);
      movimentoRepository.createQueryBuilder.mockReturnValue(qb as any);

      const resultado = await service.calcularSaldoInicialAutomatico(
        '2024-02',
        7,
        usuarioId,
      );

      expect(resultado).toBe(400);
    });

    it('deve carregar o saldo inicial anterior no cálculo automático', async () => {
      saldoInicialRepository.findOne.mockResolvedValue({
        valor: 100,
      } as SaldoInicial);
      movimentoRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '400.00' }),
      } as any);

      const resultado = await service.calcularSaldoInicialAutomatico(
        '2024-02',
        7,
        usuarioId,
      );

      expect(resultado).toBe(500);
      expect(saldoInicialRepository.findOne).toHaveBeenCalledWith({
        where: { periodo: '2024-01', contaId: 7, usuarioId },
      });
    });

    it('deve considerar receitas positivas e despesas/reservas negativas no cálculo automático do saldo inicial', async () => {
      let selectExpression = '';
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockImplementation((expression: string) => {
          selectExpression = expression;
          return qb;
        }),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockImplementation(() => {
          if (selectExpression.includes('CASE')) {
            return { total: '350.00' };
          }
          return { total: '0.00' };
        }),
      };

      saldoInicialRepository.findOne.mockResolvedValue(null);
      movimentoRepository.createQueryBuilder.mockReturnValue(qb as any);

      const resultado = await service.calcularSaldoInicialAutomatico(
        '2024-02',
        7,
        usuarioId,
      );

      expect(resultado).toBe(350);
      expect(qb.leftJoinAndSelect).toHaveBeenCalled();
      expect(selectExpression).toContain('CASE');
    });

    it('deve permitir sobrescrita manual mesmo quando o valor diverge do cálculo automático', async () => {
      const saldoInicial = {
        id: 3,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: 250,
        origem: SaldoInicialOrigem.MANUAL,
        criadoPorManual: true,
      } as SaldoInicial;

      saldoInicialRepository.findOne.mockResolvedValue(null);
      saldoInicialRepository.create.mockReturnValue(saldoInicial);
      saldoInicialRepository.save.mockResolvedValue(saldoInicial);
      movimentoRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '310.00' }),
      } as any);

      const result = await service.createSaldoInicial(
        '2024-02',
        { contaId: 7, valor: 250, origem: SaldoInicialOrigem.MANUAL },
        usuarioId,
      );

      expect(result.valor).toBe(250);
      expect(result.origem).toBe(SaldoInicialOrigem.MANUAL);
    });

    it('deve usar zero quando não há lançamentos no período anterior', async () => {
      saldoInicialRepository.findOne.mockResolvedValue(null);
      movimentoRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      } as any);

      const resultado = await service.calcularSaldoInicialAutomatico(
        '2024-02',
        7,
        usuarioId,
      );

      expect(resultado).toBe(0);
    });

    it('deve editar saldo inicial existente e manter origem/timestamps', async () => {
      const saldoInicial = {
        id: 2,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: 100,
        origem: SaldoInicialOrigem.AUTO,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SaldoInicial;

      saldoInicialRepository.findOne.mockResolvedValue(saldoInicial);
      saldoInicialRepository.save.mockResolvedValue({
        ...saldoInicial,
        valor: 175,
        origem: SaldoInicialOrigem.MANUAL,
      } as SaldoInicial);

      const result = await service.updateSaldoInicial(
        '2024-02',
        7,
        { valor: 175, origem: SaldoInicialOrigem.MANUAL },
        usuarioId,
      );

      expect(result.valor).toBe(175);
      expect(result.origem).toBe(SaldoInicialOrigem.MANUAL);
      expect(saldoInicialRepository.save).toHaveBeenCalled();
    });

    it('deve restaurar saldo manual para o cálculo automático atual', async () => {
      const saldoInicial = {
        id: 2,
        usuarioId,
        contaId: 7,
        periodo: '2024-02',
        valor: -50,
        origem: SaldoInicialOrigem.MANUAL,
        criadoPorManual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SaldoInicial;
      saldoInicialRepository.findOne
        .mockResolvedValueOnce(saldoInicial)
        .mockResolvedValueOnce(null);
      movimentoRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '325.50' }),
      } as any);
      saldoInicialRepository.save.mockImplementation(
        async (saldo) => saldo as SaldoInicial,
      );

      const result = await service.restaurarSaldoInicialAutomatico(
        '2024-02',
        7,
        usuarioId,
      );

      expect(result).toEqual(
        expect.objectContaining({
          valor: 325.5,
          origem: SaldoInicialOrigem.AUTO,
          criadoPorManual: false,
        }),
      );
      expect(saldoInicialRepository.save).toHaveBeenCalledWith(saldoInicial);
    });

    it('deve validar a propriedade da conta ao restaurar o saldo automático', async () => {
      contaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.restaurarSaldoInicialAutomatico('2024-02', 99, usuarioId),
      ).rejects.toThrow('A conta informada não existe');
      expect(saldoInicialRepository.save).not.toHaveBeenCalled();
    });

    it('deve calcular saldo final incluindo reservas do período', async () => {
      movimentoRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1250.00' }),
      } as any);
      saldoInicialRepository.findOne.mockResolvedValue({
        valor: 300,
      } as SaldoInicial);

      const resultado = await service.calcularSaldoFinal(
        '2024-02',
        7,
        usuarioId,
      );

      expect(resultado).toBe(1550);
    });
  });

  describe('remove', () => {
    it('deve remover movimento com sucesso', async () => {
      movimentoRepository.findOne.mockResolvedValue(mockMovimento);
      movimentoRepository.remove.mockResolvedValue(undefined as any);

      await service.remove(periodo, 1, usuarioId);

      expect(movimentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, periodo, usuarioId },
        relations: [
          'orcamentoItem',
          'orcamentoItem.categoria',
          'categoria',
          'conta',
          'comprovante',
        ],
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
