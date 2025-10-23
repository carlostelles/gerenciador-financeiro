import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movimento } from './entities/movimento.entity';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';

@Injectable()
export class MovimentacoesService {
  constructor(
    @InjectRepository(Movimento)
    private movimentoRepository: Repository<Movimento>,
  ) {}

  async create(
    periodo: string,
    createMovimentoDto: CreateMovimentoDto,
    usuarioId: number,
  ): Promise<Movimento> {
    // Validar se a data está dentro do período
    const dataMovimento = new Date(createMovimentoDto.data);
    const [ano, mes] = periodo.split('-');
    const anoData = dataMovimento.getFullYear();
    const mesData = dataMovimento.getMonth() + 1;

    if (anoData !== parseInt(ano) || mesData !== parseInt(mes)) {
      throw new BadRequestException(
        'A data da movimentação deve estar dentro do período especificado',
      );
    }

    const movimento = this.movimentoRepository.create({
      ...createMovimentoDto,
      periodo,
      usuarioId,
    });

    return this.movimentoRepository.save(movimento);
  }

  async findAll(periodo: string, usuarioId: number): Promise<Movimento[]> {
    return this.movimentoRepository.find({
      where: { periodo, usuarioId },
      relations: ['orcamentoItem', 'orcamentoItem.categoria'],
      order: { data: 'DESC' },
    });
  }

  async findOne(
    periodo: string,
    id: number,
    usuarioId: number,
  ): Promise<Movimento> {
    const movimento = await this.movimentoRepository.findOne({
      where: { id, periodo, usuarioId },
      relations: ['orcamentoItem', 'orcamentoItem.categoria'],
    });

    if (!movimento) {
      throw new NotFoundException('Movimentação não encontrada');
    }

    return movimento;
  }

  async update(
    periodo: string,
    id: number,
    updateMovimentoDto: UpdateMovimentoDto,
    usuarioId: number,
  ): Promise<Movimento> {
    const movimento = await this.findOne(periodo, id, usuarioId);

    // Validar se a nova data está dentro do período
    if (updateMovimentoDto.data) {
      const dataMovimento = new Date(updateMovimentoDto.data);
      const [ano, mes] = periodo.split('-');
      const anoData = dataMovimento.getFullYear();
      const mesData = dataMovimento.getMonth() + 1;

      if (anoData !== parseInt(ano) || mesData !== parseInt(mes)) {
        throw new BadRequestException(
          'A data da movimentação deve estar dentro do período especificado',
        );
      }
    }

    Object.assign(movimento, updateMovimentoDto);
    return this.movimentoRepository.save(movimento);
  }

  async remove(periodo: string, id: number, usuarioId: number): Promise<void> {
    const movimento = await this.findOne(periodo, id, usuarioId);
    await this.movimentoRepository.remove(movimento);
  }
}