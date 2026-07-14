import {
  Injectable,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movimento } from './entities/movimento.entity';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';
import { LogsService } from '../logs/logs.service';
import { LogAcao, CategoriaTipo } from '../../common/types';
import { Categoria } from '../categorias/entities/categoria.entity';
import { OrcamentoItem } from '../orcamentos/entities/orcamento-item.entity';
import { Orcamento } from '../orcamentos/entities/orcamento.entity';
import { Conta } from '../contas/entities/conta.entity';
import { MovimentoComprovante } from './entities/movimento-comprovante.entity';
import { FindMovimentosQueryDto } from './dto/find-movimentos-query.dto';
import { FindResumoQueryDto } from './dto/find-resumo-query.dto';
import { contemTodasAsPalavras } from '../../common/utils/normalize-text.util';
import { MovimentoComprovanteStorageService } from './services/movimento-comprovante-storage.service';
import {
  AnaliseComprovanteResultado,
  MovimentoComprovanteAiService,
} from './services/movimento-comprovante-ai.service';
import { AnalisarComprovanteResponseDto } from './dto/analisar-comprovante-response.dto';
import { AnalisarComprovanteRequestDto } from './dto/analisar-comprovante-request.dto';
import { ComprovanteUploadFile } from './types/comprovante-upload-file.type';

export interface ResumoCategoriaItem {
  categoriaId: number;
  categoriaNome: string;
  total: number;
}

export interface ResumoPorCategoriaResponse {
  receitas: ResumoCategoriaItem[];
  despesas: ResumoCategoriaItem[];
  reservas: ResumoCategoriaItem[];
}

export interface ComparativoPorTipoResponse {
  periodos: string[];
  receitas: number[];
  despesas: number[];
  reservas: number[];
}

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
    @InjectRepository(Conta)
    private contaRepository: Repository<Conta>,
    @InjectRepository(MovimentoComprovante)
    private comprovanteRepository: Repository<MovimentoComprovante>,
    private readonly configService: ConfigService,
    private logsService: LogsService,
    private readonly comprovanteStorageService: MovimentoComprovanteStorageService,
    private readonly comprovanteAiService: MovimentoComprovanteAiService,
  ) {}

  private readonly tiposArquivoPermitidos = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ]);

  /**
   * Converte uma string de data (YYYY-MM-DD ou ISO) em um Date local,
   * ignorando o timezone, para evitar que a data mude de dia/mês
   * dependendo do fuso horário do servidor.
   */
  private parseDataSemTimezone(data: string): Date {
    const [ano, mes, dia] = data.split('T')[0].split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  /**
   * Valida se a conta informada existe e pertence ao usuário.
   */
  private async validarConta(contaId: number, usuarioId: number): Promise<void> {
    const conta = await this.contaRepository.findOne({
      where: { id: contaId, usuarioId },
    });

    if (!conta) {
      throw new BadRequestException('A conta informada não existe');
    }
  }

  private get tamanhoMaximoComprovante(): number {
    return Number(
      this.configService.get('MOVIMENTO_COMPROVANTE_MAX_SIZE_BYTES') ||
        10 * 1024 * 1024,
    );
  }

  private validarArquivoComprovante(arquivo?: ComprovanteUploadFile): asserts arquivo is ComprovanteUploadFile {
    if (!arquivo) {
      throw new BadRequestException('Arquivo de comprovante não informado');
    }

    if (!this.tiposArquivoPermitidos.has(arquivo.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Formato de arquivo não suportado. Envie uma imagem ou PDF.',
      );
    }

    if (arquivo.size > this.tamanhoMaximoComprovante) {
      throw new PayloadTooLargeException(
        `O comprovante excede o tamanho máximo permitido de ${this.tamanhoMaximoComprovante} bytes`,
      );
    }
  }

  private async vincularComprovante(
    comprovanteId: number,
    movimentoId: number,
    usuarioId: number,
  ): Promise<void> {
    const comprovante = await this.comprovanteRepository.findOne({
      where: { id: comprovanteId, usuarioId },
    });

    if (!comprovante) {
      throw new BadRequestException('O comprovante informado não foi encontrado');
    }

    comprovante.movimentoId = movimentoId;
    await this.comprovanteRepository.save(comprovante);
  }

  async analisarComprovante(
    arquivo: ComprovanteUploadFile,
    usuarioId: number,
    request?: AnalisarComprovanteRequestDto,
  ): Promise<{ statusCode: 200 | 201 | 202; body: AnalisarComprovanteResponseDto }> {
    this.validarArquivoComprovante(arquivo);

    const categorias = await this.categoriaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });
    const contas = await this.contaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });

    const upload = await this.comprovanteStorageService.uploadComprovante(
      usuarioId,
      arquivo,
    );

    const analise: AnaliseComprovanteResultado =
      await this.comprovanteAiService.analisarComprovante(arquivo, categorias, contas);

    const comprovante = await this.comprovanteRepository.save(
      this.comprovanteRepository.create({
        usuarioId,
        movimentoId: null,
        caminhoArquivo: upload.caminhoArquivo,
        nomeArquivo: arquivo.originalname,
        tipoArquivo: arquivo.mimetype,
        tamanhoArquivo: arquivo.size,
      }),
    );

    const categoria = analise.categoriaId
      ? categorias.find((item) => item.id === analise.categoriaId) || null
      : null;
    const conta = analise.contaId
      ? contas.find((item) => item.id === analise.contaId) || null
      : null;

    const periodoAlvo = request?.periodo || analise.periodo || null;

    const camposObrigatoriosFaltantes = [
      !analise.data ? 'data' : null,
      analise.valor === null ? 'valor' : null,
      !categoria ? 'categoriaId' : null,
      request?.movimentoId && request?.periodo && analise.periodo && analise.periodo !== request.periodo
        ? 'data'
        : null,
    ].filter((campo): campo is string => !!campo);

    const body: AnalisarComprovanteResponseDto = {
      comprovanteId: comprovante.id,
      nomeArquivo: comprovante.nomeArquivo,
      tipoArquivo: comprovante.tipoArquivo,
      tamanhoArquivo: comprovante.tamanhoArquivo,
      caminhoArquivo: comprovante.caminhoArquivo,
      sugestao: {
        data: analise.data,
        periodo: analise.periodo,
        valor: analise.valor,
        descricao: analise.descricao,
        categoriaId: categoria?.id || null,
        categoriaNome: categoria?.nome || null,
        contaId: conta?.id || null,
        contaNome: conta?.nome || null,
      },
      camposObrigatoriosFaltantes,
      salvamento: {
        status: 'pendente',
      },
    };

    if (camposObrigatoriosFaltantes.length > 0 || !periodoAlvo) {
      return {
        statusCode: 202,
        body,
      };
    }

    if (request?.movimentoId) {
      const movimentoAtual = await this.movimentoRepository.findOne({
        where: { id: request.movimentoId, usuarioId },
      });

      if (!movimentoAtual) {
        throw new NotFoundException('Movimentação não encontrada para atualização automática');
      }

      const periodoAtualizacao = request.periodo || movimentoAtual.periodo;
      const updateDto: UpdateMovimentoDto = {
        data: analise.data || undefined,
        valor: analise.valor ?? undefined,
        categoriaId: categoria?.id || undefined,
        contaId: conta?.id || undefined,
      };

      if (analise.descricao && analise.descricao.trim()) {
        updateDto.descricao = analise.descricao.trim();
      }

      const movimentoAtualizado = await this.update(
        periodoAtualizacao,
        request.movimentoId,
        updateDto,
        usuarioId,
      );

      await this.vincularComprovante(comprovante.id, movimentoAtualizado.id, usuarioId);

      body.salvamento = {
        status: 'atualizado',
        movimentoId: movimentoAtualizado.id,
      };

      return {
        statusCode: 200,
        body,
      };
    }

    const createDto: CreateMovimentoDto = {
      data: analise.data!,
      valor: analise.valor!,
      descricao:
        analise.descricao && analise.descricao.trim()
          ? analise.descricao.trim()
          : 'Movimento criado a partir do comprovante',
      categoriaId: categoria!.id,
      contaId: conta?.id || undefined,
      comprovanteId: comprovante.id,
    };

    const movimentoCriado = await this.create(periodoAlvo, createDto, usuarioId);

    body.salvamento = {
      status: 'criado',
      movimentoId: movimentoCriado.id,
    };

    return {
      statusCode: 201,
      body,
    };
  }

  async create(
    periodo: string,
    createMovimentoDto: CreateMovimentoDto,
    usuarioId: number,
  ): Promise<Movimento> {
    if (createMovimentoDto.comprovanteId && createMovimentoDto.parcelas) {
      throw new BadRequestException(
        'Não é possível vincular o mesmo comprovante a uma criação parcelada',
      );
    }

    // Validar se pelo menos orcamentoItemId ou categoriaId foi informado
    if (!createMovimentoDto.orcamentoItemId && !createMovimentoDto.categoriaId) {
      throw new BadRequestException(
        'É necessário informar o item de orçamento ou a categoria',
      );
    }

    // Validar se a conta informada existe
    if (createMovimentoDto.contaId) {
      await this.validarConta(createMovimentoDto.contaId, usuarioId);
    }

    // Validar se a data está dentro do período
    const dataMovimento = this.parseDataSemTimezone(createMovimentoDto.data);
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

    let primeiroMovimentoId: number | null = null;

    for (let i = 0; i < (createMovimentoDto.parcelas || 1); i++) {
      const dataParcelada = new Date(dataMovimento);
      dataParcelada.setMonth(dataParcelada.getMonth() + i);

      const movimento = this.movimentoRepository.create({
        ...createMovimentoDto,
        data: dataParcelada,
        categoriaId,
        periodo: `${dataParcelada.getFullYear()}-${String(
          dataParcelada.getMonth() + 1,
        ).padStart(2, '0')}`,
        usuarioId,
        descricao: createMovimentoDto.descricao + (createMovimentoDto.parcelas ? ` (Parcela ${i + 1}/${createMovimentoDto.parcelas})` : ''),
      });

      const savedMovimento = await this.movimentoRepository.save(movimento);

      if (primeiroMovimentoId === null) {
        primeiroMovimentoId = savedMovimento.id;
      }

      // Log da criação
      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Movimentação criada: ${movimento.descricao}`,
        acao: LogAcao.CREATE,
        entidade: 'Movimento',
        entidadeId: savedMovimento.id.toString(),
        dadosNovos: savedMovimento,
      });
    }

    if (createMovimentoDto.comprovanteId && primeiroMovimentoId) {
      await this.vincularComprovante(
        createMovimentoDto.comprovanteId,
        primeiroMovimentoId,
        usuarioId,
      );
    }

    return this.movimentoRepository.findOne({
      where: { id: primeiroMovimentoId!, usuarioId },
      relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria', 'conta', 'comprovante'],
    });
  }

  async findAll(
    periodo: string,
    usuarioId: number,
    filtros?: FindMovimentosQueryDto,
  ): Promise<Movimento[]> {
    const categoriaId = filtros?.categoriaId
      ? parseInt(filtros.categoriaId, 10)
      : undefined;
    const contaId = filtros?.contaId
      ? parseInt(filtros.contaId, 10)
      : undefined;

    const query = this.movimentoRepository
      .createQueryBuilder('movimento')
      .leftJoinAndSelect('movimento.orcamentoItem', 'orcamentoItem')
      .leftJoinAndSelect('orcamentoItem.categoria', 'orcamentoItemCategoria')
      .leftJoinAndSelect('movimento.categoria', 'categoria')
      .leftJoinAndSelect('movimento.conta', 'conta')
      .leftJoinAndSelect('movimento.comprovante', 'comprovante')
      .where('movimento.periodo = :periodo', { periodo })
      .andWhere('movimento.usuarioId = :usuarioId', { usuarioId });

    if (categoriaId) {
      query.andWhere(
        '(movimento.categoriaId = :categoriaId OR orcamentoItem.categoriaId = :categoriaId)',
        { categoriaId },
      );
    }

    if (contaId) {
      query.andWhere('movimento.contaId = :contaId', { contaId });
    }

    query.orderBy('movimento.data', 'DESC');

    const movimentos = await query.getMany();

    if (filtros?.descricao) {
      return movimentos.filter((movimento) => {
        const descricaoCompleta = `${movimento.orcamentoItem?.descricao || ''} ${movimento.descricao || ''}`;
        return contemTodasAsPalavras(descricaoCompleta, filtros.descricao!);
      });
    }

    return movimentos;
  }

  /**
   * Retorna a soma das movimentações de um período, agrupadas por categoria
   * e separadas por tipo de categoria (receita, despesa, reserva).
   * Considera os filtros de conta informados.
   */
  async findResumoPorCategoria(
    periodo: string,
    usuarioId: number,
    filtros?: FindResumoQueryDto,
  ): Promise<ResumoPorCategoriaResponse> {
    const movimentos = await this.findAll(periodo, usuarioId, {
      contaId: filtros?.contaId,
    });

    const grupos: Record<CategoriaTipo, Map<number, ResumoCategoriaItem>> = {
      [CategoriaTipo.RECEITA]: new Map(),
      [CategoriaTipo.DESPESA]: new Map(),
      [CategoriaTipo.RESERVA]: new Map(),
    };

    for (const movimento of movimentos) {
      const categoria = movimento.orcamentoItem?.categoria || movimento.categoria;

      if (!categoria) {
        continue;
      }

      const grupo = grupos[categoria.tipo];

      if (!grupo) {
        continue;
      }

      const atual = grupo.get(categoria.id) || {
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        total: 0,
      };

      atual.total += Number(movimento.valor);
      grupo.set(categoria.id, atual);
    }

    const toSortedArray = (grupo: Map<number, ResumoCategoriaItem>) =>
      Array.from(grupo.values()).sort((a, b) => b.total - a.total);

    return {
      receitas: toSortedArray(grupos[CategoriaTipo.RECEITA]),
      despesas: toSortedArray(grupos[CategoriaTipo.DESPESA]),
      reservas: toSortedArray(grupos[CategoriaTipo.RESERVA]),
    };
  }

  async findOne(
    periodo: string,
    id: number,
    usuarioId: number,
  ): Promise<Movimento> {
    const movimento = await this.movimentoRepository.findOne({
      where: { id, periodo, usuarioId },
      relations: ['orcamentoItem', 'orcamentoItem.categoria', 'categoria', 'conta', 'comprovante'],
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

  /**
   * Retorna o comparativo de receitas, despesas e reservas por período,
   * considerando o mês atual, os últimos 5 meses e os próximos 6 meses
   * (quando existirem movimentações nos períodos correspondentes).
   * Caso não existam períodos anteriores suficientes, a quantidade faltante
   * é compensada com períodos seguintes adicionais.
   */
  async findComparativoPorTipo(
    usuarioId: number,
  ): Promise<ComparativoPorTipoResponse> {
    const periodosExistentes = await this.findPeriodos(usuarioId);
    const ordenados = [...periodosExistentes].sort();

    const agora = new Date();
    const periodoAtual = `${agora.getFullYear()}-${(agora.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;

    const anteriores = ordenados.filter((p) => p < periodoAtual).slice(-5);
    const faltantesAnteriores = 5 - anteriores.length;
    const seguintes = ordenados
      .filter((p) => p > periodoAtual)
      .slice(0, 6 + faltantesAnteriores);

    const periodos = [...anteriores, periodoAtual, ...seguintes];

    const movimentos = periodos.length
      ? await this.movimentoRepository
          .createQueryBuilder('movimento')
          .leftJoinAndSelect('movimento.orcamentoItem', 'orcamentoItem')
          .leftJoinAndSelect(
            'orcamentoItem.categoria',
            'orcamentoItemCategoria',
          )
          .leftJoinAndSelect('movimento.categoria', 'categoria')
          .where('movimento.usuarioId = :usuarioId', { usuarioId })
          .andWhere('movimento.periodo IN (:...periodos)', { periodos })
          .getMany()
      : [];

    const totais: Record<CategoriaTipo, Map<string, number>> = {
      [CategoriaTipo.RECEITA]: new Map(),
      [CategoriaTipo.DESPESA]: new Map(),
      [CategoriaTipo.RESERVA]: new Map(),
    };

    for (const movimento of movimentos) {
      const categoria =
        movimento.orcamentoItem?.categoria || movimento.categoria;

      if (!categoria || !totais[categoria.tipo]) {
        continue;
      }

      const grupo = totais[categoria.tipo];
      grupo.set(
        movimento.periodo,
        (grupo.get(movimento.periodo) || 0) + Number(movimento.valor),
      );
    }

    const toSeries = (grupo: Map<string, number>) =>
      periodos.map((periodo) => grupo.get(periodo) || 0);

    return {
      periodos,
      receitas: toSeries(totais[CategoriaTipo.RECEITA]),
      despesas: toSeries(totais[CategoriaTipo.DESPESA]),
      reservas: toSeries(totais[CategoriaTipo.RESERVA]),
    };
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
      const dataMovimento = this.parseDataSemTimezone(updateMovimentoDto.data);
      const [ano, mes] = periodo.split('-');
      const anoData = dataMovimento.getFullYear();
      const mesData = dataMovimento.getMonth() + 1;

      if (anoData !== parseInt(ano) || mesData !== parseInt(mes)) {
        throw new BadRequestException(
          'A data da movimentação deve estar dentro do período especificado',
        );
      }
    }

    // Validar se a conta informada existe
    if (updateMovimentoDto.contaId) {
      await this.validarConta(updateMovimentoDto.contaId, usuarioId);
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
    const { orcamentoItem, categoria, conta, ...movimentoData } = movimento;
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