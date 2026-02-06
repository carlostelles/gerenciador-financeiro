import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orcamento } from './entities/orcamento.entity';
import { OrcamentoItem } from './entities/orcamento-item.entity';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { CreateOrcamentoItemDto } from './dto/create-orcamento-item.dto';
import { UpdateOrcamentoItemDto } from './dto/update-orcamento-item.dto';
import { OrcamentoByPeriodoResponseDto } from './dto/find-by-periodo.dto';
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';

@Injectable()
export class OrcamentosService {
  constructor(
    @InjectRepository(Orcamento)
    private orcamentoRepository: Repository<Orcamento>,
    @InjectRepository(OrcamentoItem)
    private orcamentoItemRepository: Repository<OrcamentoItem>,
    private logsService: LogsService,
  ) {}

  async create(
    createOrcamentoDto: CreateOrcamentoDto,
    usuarioId: number,
  ): Promise<Orcamento> {
    const existingOrcamento = await this.orcamentoRepository.findOne({
      where: { periodo: createOrcamentoDto.periodo, usuarioId },
    });

    if (existingOrcamento) {
      throw new ConflictException(
        'Já existe um orçamento para este período',
      );
    }

    const orcamento = this.orcamentoRepository.create({
      ...createOrcamentoDto,
      usuarioId,
    });

    const savedOrcamento = await this.orcamentoRepository.save(orcamento);

    // Log da criação
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Orçamento criado: ${savedOrcamento.descricao} (${savedOrcamento.periodo})`,
        acao: LogAcao.CREATE,
        entidade: 'Orcamento',
        entidadeId: savedOrcamento.id.toString(),
        dadosNovos: savedOrcamento,
      });
    } catch (error) {
      // Falha ao registrar log não impede operação principal
      console.error('Erro ao registrar log de criação de orçamento:', error);
    }

    return savedOrcamento;
  }

  async findAll(usuarioId: number): Promise<Orcamento[]> {
    return this.orcamentoRepository.find({
      where: { usuarioId },
      relations: ['items', 'items.categoria'],
      order: { periodo: 'DESC' },
    });
  }

  async findPeriodos(usuarioId: number): Promise<string[]> {
    const orcamentos = await this.orcamentoRepository.find({
      where: { usuarioId },
      select: ['periodo'],
      order: { periodo: 'DESC' },
    });

    return orcamentos.map(orcamento => orcamento.periodo);
  }

  async findByPeriodo(
    periodo: string,
    usuarioId: number,
  ): Promise<OrcamentoByPeriodoResponseDto | null> {
    const orcamento = await this.orcamentoRepository.findOne({
      where: { periodo, usuarioId },
      relations: ['items', 'items.categoria'],
    });

    if (!orcamento) {
      return null;
    }

    // Mapear a resposta para incluir apenas id e descricao da categoria
    const response: OrcamentoByPeriodoResponseDto = {
      id: orcamento.id,
      periodo: orcamento.periodo,
      descricao: orcamento.descricao,
      createdAt: orcamento.createdAt,
      updatedAt: orcamento.updatedAt,
      items: orcamento.items.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        valor: item.valor,
        categoria: {
          id: item.categoria.id,
          nome: item.categoria.nome,
          tipo: item.categoria.tipo,
        },
      })),
    };

    return response;
  }

  async findOne(id: number, usuarioId: number): Promise<Orcamento> {
    const orcamento = await this.orcamentoRepository.findOne({
      where: { id, usuarioId },
      relations: ['items', 'items.categoria'],
    });

    if (!orcamento) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    return orcamento;
  }

  async update(
    id: number,
    updateOrcamentoDto: UpdateOrcamentoDto,
    usuarioId: number,
  ): Promise<Orcamento> {
    const orcamento = await this.findOne(id, usuarioId);

    if (updateOrcamentoDto.periodo) {
      const existingOrcamento = await this.orcamentoRepository.findOne({
        where: { periodo: updateOrcamentoDto.periodo, usuarioId },
      });

      if (existingOrcamento && existingOrcamento.id !== id) {
        throw new ConflictException(
          'Já existe um orçamento para este período',
        );
      }
    }

    const dadosAnteriores = JSON.parse(JSON.stringify(orcamento));
    Object.assign(orcamento, updateOrcamentoDto);
    const orcamentoAtualizado = await this.orcamentoRepository.save(orcamento);

    // Log da atualização
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Orçamento atualizado: ${orcamentoAtualizado.descricao} (${orcamentoAtualizado.periodo})`,
        acao: LogAcao.UPDATE,
        entidade: 'Orcamento',
        entidadeId: id.toString(),
        dadosAnteriores,
        dadosNovos: orcamentoAtualizado,
      });
    } catch (error) {
      console.error('Erro ao registrar log de atualização de orçamento:', error);
    }

    return orcamentoAtualizado;
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const orcamento = await this.findOne(id, usuarioId);

    if (orcamento.items && orcamento.items.length > 0) {
      throw new ConflictException(
        'Não é possível excluir um orçamento que possui itens vinculados',
      );
    }

    await this.orcamentoRepository.remove(orcamento);

    // Log da exclusão
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Orçamento excluído: ${orcamento.descricao} (${orcamento.periodo})`,
        acao: LogAcao.DELETE,
        entidade: 'Orcamento',
        entidadeId: id.toString(),
        dadosAnteriores: orcamento,
      });
    } catch (error) {
      console.error('Erro ao registrar log de exclusão de orçamento:', error);
    }
  }

  async clone(
    id: number,
    periodo: string,
    usuarioId: number,
  ): Promise<Orcamento> {
    const orcamentoOriginal = await this.findOne(id, usuarioId);

    const existingOrcamento = await this.orcamentoRepository.findOne({
      where: { periodo, usuarioId },
    });

    if (existingOrcamento) {
      throw new ConflictException(
        'Já existe um orçamento para este período',
      );
    }

    const novoOrcamento = this.orcamentoRepository.create({
      periodo,
      descricao: `${orcamentoOriginal.descricao} (Clonado)`,
      usuarioId,
    });

    const orcamentoSalvo = await this.orcamentoRepository.save(novoOrcamento);

    // Clonar itens
    const itensClonados = orcamentoOriginal.items.map((item) =>
      this.orcamentoItemRepository.create({
        descricao: item.descricao,
        valor: item.valor,
        categoriaId: item.categoriaId,
        orcamentoId: orcamentoSalvo.id,
      }),
    );

    await this.orcamentoItemRepository.save(itensClonados);

    const orcamentoCompleto = await this.findOne(orcamentoSalvo.id, usuarioId);

    // Log da clonagem
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Orçamento clonado: ${orcamentoCompleto.descricao} (${orcamentoCompleto.periodo})`,
        acao: LogAcao.CREATE,
        entidade: 'Orcamento',
        entidadeId: orcamentoSalvo.id.toString(),
        dadosNovos: orcamentoCompleto,
      });
    } catch (error) {
      console.error('Erro ao registrar log de clonagem de orçamento:', error);
    }

    return orcamentoCompleto;
  }

  // Métodos para itens de orçamento
  async createItem(
    orcamentoId: number,
    createItemDto: CreateOrcamentoItemDto,
    usuarioId: number,
  ): Promise<OrcamentoItem> {
    await this.findOne(orcamentoId, usuarioId);

    const item = this.orcamentoItemRepository.create({
      ...createItemDto,
      orcamentoId,
    });

    const savedItem = await this.orcamentoItemRepository.save(item);

    // Log da criação do item
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Item de orçamento criado: ${savedItem.descricao}`,
        acao: LogAcao.CREATE,
        entidade: 'OrcamentoItem',
        entidadeId: savedItem.id.toString(),
        dadosNovos: savedItem,
      });
    } catch (error) {
      console.error('Erro ao registrar log de criação de item de orçamento:', error);
    }

    return savedItem;
  }

  async findItems(orcamentoId: number, usuarioId: number): Promise<OrcamentoItem[]> {
    await this.findOne(orcamentoId, usuarioId);

    return this.orcamentoItemRepository.find({
      where: { orcamentoId },
      relations: ['categoria'],
    });
  }

  async findItem(
    orcamentoId: number,
    itemId: number,
    usuarioId: number,
  ): Promise<OrcamentoItem> {
    await this.findOne(orcamentoId, usuarioId);

    const item = await this.orcamentoItemRepository.findOne({
      where: { id: itemId, orcamentoId },
      relations: ['categoria'],
    });

    if (!item) {
      throw new NotFoundException('Item de orçamento não encontrado');
    }

    return item;
  }

  async updateItem(
    orcamentoId: number,
    itemId: number,
    updateItemDto: UpdateOrcamentoItemDto,
    usuarioId: number,
  ): Promise<OrcamentoItem> {
    const item = await this.findItem(orcamentoId, itemId, usuarioId);

    const dadosAnteriores = JSON.parse(JSON.stringify(item));
    Object.assign(item, updateItemDto);
    const itemAtualizado = await this.orcamentoItemRepository.save(item);

    // Log da atualização do item
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Item de orçamento atualizado: ${itemAtualizado.descricao}`,
        acao: LogAcao.UPDATE,
        entidade: 'OrcamentoItem',
        entidadeId: itemId.toString(),
        dadosAnteriores,
        dadosNovos: itemAtualizado,
      });
    } catch (error) {
      console.error('Erro ao registrar log de atualização de item de orçamento:', error);
    }

    return itemAtualizado;
  }

  async removeItem(
    orcamentoId: number,
    itemId: number,
    usuarioId: number,
  ): Promise<void> {
    const item = await this.findItem(orcamentoId, itemId, usuarioId);

    // Verificar se há movimentações vinculadas
    if (item.movimentos && item.movimentos.length > 0) {
      throw new ConflictException(
        'Não é possível excluir um item que possui movimentações vinculadas',
      );
    }

    await this.orcamentoItemRepository.remove(item);

    // Log da exclusão do item
    try {
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Item de orçamento excluído: ${item.descricao}`,
        acao: LogAcao.DELETE,
        entidade: 'OrcamentoItem',
        entidadeId: itemId.toString(),
        dadosAnteriores: item,
      });
    } catch (error) {
      console.error('Erro ao registrar log de exclusão de item de orçamento:', error);
    }
  }
}