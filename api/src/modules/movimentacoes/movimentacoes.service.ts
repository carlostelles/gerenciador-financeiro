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
import { Categoria } from '../categorias/entities/categoria.entity';
import { OrcamentoItem } from '../orcamentos/entities/orcamento-item.entity';
import { Orcamento } from '../orcamentos/entities/orcamento.entity';

@Injectable()
export class MovimentacoesService {
  constructor(
    @InjectRepository(Movimento)
    private movimentoRepository: Repository<Movimento>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    @InjectRepository(OrcamentoItem)
    private orcamentoItemRepository: Repository<OrcamentoItem>,
    @InjectRepository(Orcamento)
    private orcamentoRepository: Repository<Orcamento>,
    private logsService: LogsService,
  ) {}

  async create(
    periodo: string,
    createMovimentoDto: CreateMovimentoDto,
    usuarioId: number,
  ): Promise<Movimento> {
    // Validar se pelo menos orcamentoItemId ou categoriaId foi informado
    if (!createMovimentoDto.orcamentoItemId && !createMovimentoDto.categoriaId) {
      throw new BadRequestException(
        'É necessário informar o item de orçamento ou a categoria',
      );
    }

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

    // Se orcamentoItemId informado e categoriaId não, resolver categoriaId a partir do item
    let categoriaId = createMovimentoDto.categoriaId;
    if (createMovimentoDto.orcamentoItemId && !categoriaId) {
      const orcamentoItem = await this.orcamentoItemRepository.findOne({
        where: { id: createMovimentoDto.orcamentoItemId },
      });
      if (orcamentoItem) {
        categoriaId = orcamentoItem.categoriaId;
      }
    }

    const movimento = this.movimentoRepository.create({
      ...createMovimentoDto,
      categoriaId,
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
      relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria'],
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
      relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria'],
    });

    if (!movimento) {
      throw new NotFoundException('Movimentação não encontrada');
    }

    return movimento;
  }

  /**
   * Retorna as categorias disponíveis para um período, mesclando:
   * 1. Itens do orçamento existente para o período (com dados do item)
   * 2. Categorias cadastradas pelo usuário que NÃO estejam no orçamento
   */
  async findCategoriasForPeriodo(
    periodo: string,
    usuarioId: number,
  ): Promise<{
    orcamentoItens: Array<{
      orcamentoItemId: number;
      descricao: string;
      valor: number;
      categoriaId: number;
      categoriaNome: string;
      categoriaTipo: string;
      source: 'orcamento';
    }>;
    categorias: Array<{
      categoriaId: number;
      categoriaNome: string;
      categoriaTipo: string;
      source: 'categoria';
    }>;
  }> {
    // Buscar orçamento do período (se existir)
    const orcamento = await this.orcamentoRepository.findOne({
      where: { periodo, usuarioId },
      relations: ['items', 'items.categoria'],
    });

    const orcamentoItens = (orcamento?.items || []).map((item) => ({
      orcamentoItemId: item.id,
      descricao: item.descricao,
      valor: Number(item.valor),
      categoriaId: item.categoriaId,
      categoriaNome: item.categoria.nome,
      categoriaTipo: item.categoria.tipo,
      source: 'orcamento' as const,
    }));

    // IDs das categorias já presentes no orçamento
    const categoriaIdsNoOrcamento = new Set(
      orcamentoItens.map((item) => item.categoriaId),
    );

    // Buscar categorias do usuário que NÃO estejam no orçamento
    const todasCategorias = await this.categoriaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });

    const categorias = todasCategorias
      .filter((cat) => !categoriaIdsNoOrcamento.has(cat.id))
      .map((cat) => ({
        categoriaId: cat.id,
        categoriaNome: cat.nome,
        categoriaTipo: cat.tipo,
        source: 'categoria' as const,
      }));

    return { orcamentoItens, categorias };
  }

  async findPeriodos(usuarioId: number): Promise<string[]> {
    const result = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .select('DISTINCT movimento.periodo', 'periodo')
      .where('movimento.usuarioId = :usuarioId', { usuarioId })
      .orderBy('movimento.periodo', 'DESC')
      .getRawMany();

    return result.map((r) => r.periodo);
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

    // Se orcamentoItemId informado, resolver categoriaId a partir do item
    if (updateMovimentoDto.orcamentoItemId && !updateMovimentoDto.categoriaId) {
      const orcamentoItem = await this.orcamentoItemRepository.findOne({
        where: { id: updateMovimentoDto.orcamentoItemId },
      });
      if (orcamentoItem) {
        updateMovimentoDto.categoriaId = orcamentoItem.categoriaId;
      }
    }

    const dadosAnteriores = JSON.parse(JSON.stringify(movimento));
    const { orcamentoItem, categoria, ...movimentoData } = movimento;
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