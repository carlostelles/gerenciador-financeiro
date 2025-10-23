import { Test, TestingModule } from '@nestjs/testing';
import { OrcamentosController } from './orcamentos.controller';
import { OrcamentosService } from './orcamentos.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { CreateOrcamentoItemDto } from './dto/create-orcamento-item.dto';
import { UpdateOrcamentoItemDto } from './dto/update-orcamento-item.dto';
import { Orcamento } from './entities/orcamento.entity';
import { OrcamentoItem } from './entities/orcamento-item.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('OrcamentosController', () => {
  let controller: OrcamentosController;
  let service: jest.Mocked<OrcamentosService>;

  const mockUser = { sub: 1 };

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

  const mockOrcamentoItem = {
    id: 1,
    orcamentoId: 1,
    categoriaId: 1,
    descricao: 'Test item',
    valor: 1000.00,
    createdAt: new Date(),
    updatedAt: new Date(),
    orcamento: null,
    categoria: null,
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

  const mockUpdateItemDto: UpdateOrcamentoItemDto = {
    descricao: 'Updated item',
  };

  beforeEach(async () => {
    const mockOrcamentosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      clone: jest.fn(),
      findPeriodos: jest.fn(),
      createItem: jest.fn(),
      findItems: jest.fn(),
      findItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrcamentosController],
      providers: [
        {
          provide: OrcamentosService,
          useValue: mockOrcamentosService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrcamentosController>(OrcamentosController);
    service = module.get(OrcamentosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('deve criar orçamento', async () => {
      service.create.mockResolvedValue(mockOrcamento);

      const result = await controller.create(mockCreateOrcamentoDto, mockUser);

      expect(service.create).toHaveBeenCalledWith(mockCreateOrcamentoDto, mockUser.sub);
      expect(result).toEqual(mockOrcamento);
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os orçamentos', async () => {
      const mockOrcamentos = [mockOrcamento];
      service.findAll.mockResolvedValue(mockOrcamentos);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.sub);
      expect(result).toEqual(mockOrcamentos);
    });
  });

  describe('findPeriodos', () => {
    it('deve retornar todos os períodos', async () => {
      const mockPeriodos = ['2024-01', '2024-02', '2024-03'];
      service.findPeriodos.mockResolvedValue(mockPeriodos);

      const result = await controller.findPeriodos(mockUser);

      expect(service.findPeriodos).toHaveBeenCalledWith(mockUser.sub);
      expect(result).toEqual(mockPeriodos);
    });
  });

  describe('findOne', () => {
    it('deve retornar orçamento por ID', async () => {
      service.findOne.mockResolvedValue(mockOrcamento);

      const result = await controller.findOne(1, mockUser);

      expect(service.findOne).toHaveBeenCalledWith(1, mockUser.sub);
      expect(result).toEqual(mockOrcamento);
    });
  });

  describe('update', () => {
    it('deve atualizar orçamento', async () => {
      const updatedOrcamento = { ...mockOrcamento, ...mockUpdateOrcamentoDto };
      service.update.mockResolvedValue(updatedOrcamento as Orcamento);

      const result = await controller.update(1, mockUpdateOrcamentoDto, mockUser);

      expect(service.update).toHaveBeenCalledWith(1, mockUpdateOrcamentoDto, mockUser.sub);
      expect(result).toEqual(updatedOrcamento);
    });
  });

  describe('remove', () => {
    it('deve remover orçamento', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, mockUser);

      expect(service.remove).toHaveBeenCalledWith(1, mockUser.sub);
      expect(result).toBeUndefined();
    });
  });

  describe('clone', () => {
    it('deve clonar orçamento', async () => {
      const clonedOrcamento = { ...mockOrcamento, periodo: '2024-02' };
      service.clone.mockResolvedValue(clonedOrcamento as Orcamento);

      const result = await controller.clone(1, '2024-02', mockUser);

      expect(service.clone).toHaveBeenCalledWith(1, '2024-02', mockUser.sub);
      expect(result).toEqual(clonedOrcamento);
    });
  });

  describe('createItem', () => {
    it('deve criar item de orçamento', async () => {
      service.createItem.mockResolvedValue(mockOrcamentoItem);

      const result = await controller.createItem(1, mockCreateItemDto, mockUser);

      expect(service.createItem).toHaveBeenCalledWith(1, mockCreateItemDto, mockUser.sub);
      expect(result).toEqual(mockOrcamentoItem);
    });
  });

  describe('findItems', () => {
    it('deve retornar todos os itens de orçamento', async () => {
      const mockItems = [mockOrcamentoItem];
      service.findItems.mockResolvedValue(mockItems);

      const result = await controller.findItems(1, mockUser);

      expect(service.findItems).toHaveBeenCalledWith(1, mockUser.sub);
      expect(result).toEqual(mockItems);
    });
  });

  describe('findItem', () => {
    it('deve retornar item de orçamento por ID', async () => {
      service.findItem.mockResolvedValue(mockOrcamentoItem);

      const result = await controller.findItem(1, 1, mockUser);

      expect(service.findItem).toHaveBeenCalledWith(1, 1, mockUser.sub);
      expect(result).toEqual(mockOrcamentoItem);
    });
  });

  describe('updateItem', () => {
    it('deve atualizar item de orçamento', async () => {
      const updatedItem = { ...mockOrcamentoItem, ...mockUpdateItemDto };
      service.updateItem.mockResolvedValue(updatedItem as OrcamentoItem);

      const result = await controller.updateItem(1, 1, mockUpdateItemDto, mockUser);

      expect(service.updateItem).toHaveBeenCalledWith(1, 1, mockUpdateItemDto, mockUser.sub);
      expect(result).toEqual(updatedItem);
    });
  });

  describe('removeItem', () => {
    it('deve remover item de orçamento', async () => {
      service.removeItem.mockResolvedValue(undefined);

      const result = await controller.removeItem(1, 1, mockUser);

      expect(service.removeItem).toHaveBeenCalledWith(1, 1, mockUser.sub);
      expect(result).toBeUndefined();
    });
  });
});