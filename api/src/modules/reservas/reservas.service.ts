import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';
import { EspacosService } from '../espacos/espacos.service';
import { EspacoPapel } from '../espacos/entities/espaco-membro.entity';
import { CategoriasService } from '../categorias/categorias.service';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private reservaRepository: Repository<Reserva>,
    private logsService: LogsService,
    @Optional() private espacosService?: EspacosService,
    @Optional() private categoriasService?: CategoriasService,
  ) {}

  async create(
    createReservaDto: CreateReservaDto,
    usuarioId: number,
    espacoId?: number,
  ): Promise<Reserva> {
    const contexto = await this.contexto(usuarioId, espacoId, true);
    if (contexto && this.categoriasService) {
      await this.categoriasService.findOne(
        createReservaDto.categoriaId,
        { sub: usuarioId },
        contexto,
      );
    }
    const reserva = this.reservaRepository.create({
      ...createReservaDto,
      usuarioId,
      ...(contexto ? { espacoId: contexto } : {}),
    });

    const savedReserva = await this.reservaRepository.save(reserva);

    // Log da criação
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Reserva criada: ${savedReserva.descricao}`,
        acao: LogAcao.CREATE,
        entidade: 'Reserva',
        entidadeId: savedReserva.id.toString(),
        dadosNovos: savedReserva,
      });
    } catch (error) {
      // Optionally log this error somewhere else or ignore
      // console.error('Failed to log reserva creation:', error);
    }

    return savedReserva;
  }

  async findAll(usuarioId: number, espacoId?: number): Promise<Reserva[]> {
    const contexto = await this.contexto(usuarioId, espacoId);
    return this.reservaRepository.find({
      where: contexto ? { espacoId: contexto } : { usuarioId },
      relations: ['categoria'],
      order: { data: 'DESC' },
    });
  }

  async findOne(
    id: number,
    usuarioId: number,
    espacoId?: number,
    escrita = false,
  ): Promise<Reserva> {
    const contexto = await this.contexto(usuarioId, espacoId, escrita);
    const reserva = await this.reservaRepository.findOne({
      where: contexto ? { id, espacoId: contexto } : { id, usuarioId },
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
    espacoId?: number,
  ): Promise<Reserva> {
    const reserva = await this.findOne(id, usuarioId, espacoId, true);
    if (
      updateReservaDto.categoriaId &&
      reserva.espacoId &&
      this.categoriasService
    ) {
      await this.categoriasService.findOne(
        updateReservaDto.categoriaId,
        { sub: usuarioId },
        reserva.espacoId,
      );
    }

    const dadosAnteriores = JSON.parse(JSON.stringify(reserva));
    Object.assign(reserva, updateReservaDto);
    const reservaAtualizada = await this.reservaRepository.save(reserva);

    // Log da atualização
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Reserva atualizada: ${reservaAtualizada.descricao}`,
        acao: LogAcao.UPDATE,
        entidade: 'Reserva',
        entidadeId: id.toString(),
        dadosAnteriores,
        dadosNovos: reservaAtualizada,
      });
    } catch (error) {
      // Optionally log this error somewhere else or ignore
      // console.error('Failed to log reserva update:', error);
    }

    return reservaAtualizada;
  }

  async remove(
    id: number,
    usuarioId: number,
    espacoId?: number,
  ): Promise<void> {
    const reserva = await this.findOne(id, usuarioId, espacoId, true);

    await this.reservaRepository.remove(reserva);

    // Log da exclusão
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Reserva excluída: ${reserva.descricao}`,
        acao: LogAcao.DELETE,
        entidade: 'Reserva',
        entidadeId: id.toString(),
        dadosAnteriores: reserva,
      });
    } catch (error) {
      // Optionally log this error somewhere else or ignore
      // console.error('Failed to log reserva deletion:', error);
    }
  }

  private async contexto(
    usuarioId: number,
    espacoId?: number,
    escrita = false,
  ): Promise<number | undefined> {
    if (!this.espacosService) return undefined;
    return (
      await this.espacosService.resolveContext(
        espacoId,
        usuarioId,
        escrita ? [EspacoPapel.OWNER, EspacoPapel.EDITOR] : undefined,
      )
    ).espacoId;
  }
}
