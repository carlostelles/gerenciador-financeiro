import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private reservaRepository: Repository<Reserva>,
  ) {}

  async create(
    createReservaDto: CreateReservaDto,
    usuarioId: number,
  ): Promise<Reserva> {
    const reserva = this.reservaRepository.create({
      ...createReservaDto,
      usuarioId,
    });

    return this.reservaRepository.save(reserva);
  }

  async findAll(usuarioId: number): Promise<Reserva[]> {
    return this.reservaRepository.find({
      where: { usuarioId },
      relations: ['categoria'],
      order: { data: 'DESC' },
    });
  }

  async findOne(id: number, usuarioId: number): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({
      where: { id, usuarioId },
      relations: ['categoria'],
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada');
    }

    return reserva;
  }

  async update(
    id: number,
    updateReservaDto: UpdateReservaDto,
    usuarioId: number,
  ): Promise<Reserva> {
    const reserva = await this.findOne(id, usuarioId);

    Object.assign(reserva, updateReservaDto);
    return this.reservaRepository.save(reserva);
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const reserva = await this.findOne(id, usuarioId);
    await this.reservaRepository.remove(reserva);
  }
}