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
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';

@Injectable()
export class MovimentacoesService {
  constructor(
    @InjectRepository(Movimento)
    private movimentoRepository: Repository<Movimento>,
    private logsService: LogsService,
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

    const savedMovimento = await this.movimentoRepository.save(movimento);

    // Log da criação
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Movimentação criada: ${savedMovimento.descricao}`,
      acao: LogAcao.CREATE,
      entidade: 'Movimento',
      entidadeId: savedMovimento.id.toString(),
      dadosNovos: savedMovimento,
    });

    return savedMovimento;
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

    const dadosAnteriores = JSON.parse(JSON.stringify(movimento));
    const { orcamentoItem, ...movimentoData } = movimento;
    Object.assign(movimentoData, updateMovimentoDto);
    
    const movimentoAtualizado = await this.movimentoRepository.save(movimentoData);

    // Log da atualização
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Movimentação atualizada: ${movimentoAtualizado.descricao}`,
      acao: LogAcao.UPDATE,
      entidade: 'Movimento',
      entidadeId: id.toString(),
      dadosAnteriores,
      dadosNovos: movimentoAtualizado,
    });
    
    return movimentoAtualizado;
  }

  async remove(periodo: string, id: number, usuarioId: number): Promise<void> {
    const movimento = await this.findOne(periodo, id, usuarioId);
    
    await this.movimentoRepository.remove(movimento);

    // Log da exclusão
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Movimentação excluída: ${movimento.descricao}`,
      acao: LogAcao.DELETE,
      entidade: 'Movimento',
      entidadeId: id.toString(),
      dadosAnteriores: movimento,
    });
  }
}