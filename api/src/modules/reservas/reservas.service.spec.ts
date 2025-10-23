import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { ReservasService } from './reservas.service';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

describe('ReservasService', () => {
  let service: ReservasService;
  let repository: jest.Mocked<Repository<Reserva>>;

  const mockReserva = {
    id: 1,
    usuarioId: 1,
    data: new Date('2024-01-15'),
    descricao: 'Test reserva',
    valor: 500.00,
    categoriaId: 1,
    status: 'ATIVA',
    createdAt: new Date(),
    updatedAt: new Date(),
    usuario: null,
    categoria: null,
  } as Reserva;

  const mockCreateReservaDto: CreateReservaDto = {
    data: '2024-01-15',
    descricao: 'Test reserva',
    valor: 500.00,
    categoriaId: 1,
  };

  const mockUpdateReservaDto: UpdateReservaDto = {
    descricao: 'Updated reserva',
    valor: 750.00,
  };

  const usuarioId = 1;

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
        ReservasService,
        {
          provide: getRepositoryToken(Reserva),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReservasService>(ReservasService);
    repository = module.get(getRepositoryToken(Reserva));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar nova reserva com sucesso', async () => {
      repository.create.mockReturnValue(mockReserva);
      repository.save.mockResolvedValue(mockReserva);

      const result = await service.create(mockCreateReservaDto, usuarioId);

      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateReservaDto,
        usuarioId,
      });
      expect(repository.save).toHaveBeenCalledWith(mockReserva);
      expect(result).toEqual(mockReserva);
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as reservas para usuário', async () => {
      const mockReservas = [mockReserva];
      repository.find.mockResolvedValue(mockReservas);

      const result = await service.findAll(usuarioId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { usuarioId },
        relations: ['categoria'],
        order: { data: 'DESC' },
      });
      expect(result).toEqual(mockReservas);
    });
  });

  describe('findOne', () => {
    it('deve retornar reserva quando encontrada', async () => {
      repository.findOne.mockResolvedValue(mockReserva);

      const result = await service.findOne(1, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuarioId },
        relations: ['categoria'],
      });
      expect(result).toEqual(mockReserva);
    });

    it('deve lançar NotFoundException quando reserva não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar reserva com sucesso', async () => {
      repository.findOne.mockResolvedValue(mockReserva);
      const updatedReserva = { ...mockReserva, ...mockUpdateReservaDto };
      repository.save.mockResolvedValue(updatedReserva as Reserva);

      const result = await service.update(1, mockUpdateReservaDto, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuarioId },
        relations: ['categoria'],
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedReserva);
    });

    it('deve lançar NotFoundException quando reserva não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, mockUpdateReservaDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve remover reserva com sucesso', async () => {
      repository.findOne.mockResolvedValue(mockReserva);
      repository.remove.mockResolvedValue(undefined);

      await service.remove(1, usuarioId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, usuarioId },
        relations: ['categoria'],
      });
      expect(repository.remove).toHaveBeenCalledWith(mockReserva);
    });

    it('deve lançar NotFoundException quando reserva não for encontrada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});