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

@Injectable()
export class OrcamentosService {
  constructor(
    @InjectRepository(Orcamento)
    private orcamentoRepository: Repository<Orcamento>,
    @InjectRepository(OrcamentoItem)
    private orcamentoItemRepository: Repository<OrcamentoItem>,
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

    return this.orcamentoRepository.save(orcamento);
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
  ): Promise<OrcamentoByPeriodoResponseDto> {
    const orcamento = await this.orcamentoRepository.findOne({
      where: { periodo, usuarioId },
      relations: ['items', 'items.categoria'],
    });

    if (!orcamento) {
      throw new NotFoundException(
        `Orçamento não encontrado para o período ${periodo}`,
      );
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

    Object.assign(orcamento, updateOrcamentoDto);
    return this.orcamentoRepository.save(orcamento);
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const orcamento = await this.findOne(id, usuarioId);

    if (orcamento.items && orcamento.items.length > 0) {
      throw new ConflictException(
        'Não é possível excluir um orçamento que possui itens vinculados',
      );
    }

    await this.orcamentoRepository.remove(orcamento);
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

    return this.findOne(orcamentoSalvo.id, usuarioId);
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

    return this.orcamentoItemRepository.save(item);
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

    Object.assign(item, updateItemDto);
    return this.orcamentoItemRepository.save(item);
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
  }
}