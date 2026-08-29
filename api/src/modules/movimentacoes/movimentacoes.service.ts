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
import {
  SaldoInicial,
  SaldoInicialOrigem,
} from './entities/saldo-inicial.entity';
import { CreateSaldoInicialDto } from './dto/create-saldo-inicial.dto';
import { UpdateSaldoInicialDto } from './dto/update-saldo-inicial.dto';
import { FindMovimentosQueryDto } from './dto/find-movimentos-query.dto';
import { FindResumoQueryDto } from './dto/find-resumo-query.dto';
import {
  contemTodasAsPalavras,
  normalizarTexto,
} from '../../common/utils/normalize-text.util';
import { MovimentoComprovanteStorageService } from './services/movimento-comprovante-storage.service';
import {
  AnaliseComprovanteResultado,
  AnaliseLancamentoExtrato,
  MovimentoComprovanteAiService,
} from './services/movimento-comprovante-ai.service';
import {
  AnalisarComprovanteResponseDto,
  AnalisarComprovantesLoteResponseDto,
} from './dto/analisar-comprovante-response.dto';
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

export interface SaldoInicialContaResponse extends SaldoInicial {
  contaNome: string;
}

export interface SaldosIniciaisResponse {
  periodo: string;
  valorTotal: number;
  quantidadeContas: number;
  saldos: SaldoInicialContaResponse[];
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
    @InjectRepository(SaldoInicial)
    private saldoInicialRepository: Repository<SaldoInicial>,
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
  private async validarConta(
    contaId: number,
    usuarioId: number,
  ): Promise<void> {
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

  private validarArquivoComprovante(
    arquivo?: ComprovanteUploadFile,
  ): asserts arquivo is ComprovanteUploadFile {
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
      throw new BadRequestException(
        'O comprovante informado não foi encontrado',
      );
    }

    comprovante.movimentoId = movimentoId;
    await this.comprovanteRepository.save(comprovante);
  }

  async obterUrlComprovante(
    comprovanteId: number,
    usuarioId: number,
  ): Promise<{ url: string }> {
    const comprovante = await this.comprovanteRepository.findOne({
      where: { id: comprovanteId, usuarioId },
    });
    if (!comprovante) {
      throw new NotFoundException('Arquivo anexado não encontrado');
    }

    return {
      url: await this.comprovanteStorageService.obterUrlVisualizacao(
        comprovante.caminhoArquivo,
      ),
    };
  }

  private getPeriodoAtual(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  private validarPeriodoSaldoInicial(periodo: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      throw new BadRequestException('O período deve estar no formato YYYY-MM');
    }
  }

  private getPeriodoAnterior(periodo: string): string {
    const [ano, mes] = periodo.split('-').map(Number);
    let anoAnterior = ano;
    let mesAnterior = mes - 1;

    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior -= 1;
    }

    return `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}`;
  }

  private async encontrarSaldoInicial(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<SaldoInicial | null> {
    return this.saldoInicialRepository.findOne({
      where: { periodo, contaId, usuarioId },
    });
  }

  private async resolverSaldoInicial(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<SaldoInicial> {
    return (
      (await this.encontrarSaldoInicial(periodo, contaId, usuarioId)) ||
      ({
        id: null,
        usuarioId,
        contaId,
        periodo,
        valor: await this.calcularSaldoInicialAutomatico(
          periodo,
          contaId,
          usuarioId,
        ),
        origem: SaldoInicialOrigem.AUTO,
        criadoPorManual: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SaldoInicial)
    );
  }

  private async calcularTotalMovimentosPeriodo(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<number> {
    const resultado = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .leftJoinAndSelect('movimento.categoria', 'categoria')
      .leftJoinAndSelect('movimento.orcamentoItem', 'orcamentoItem')
      .leftJoinAndSelect('orcamentoItem.categoria', 'orcamentoItemCategoria')
      .select(
        `COALESCE(
          SUM(
            CASE
              WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) = :receita THEN movimento.valor
              WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) = :despesa THEN -movimento.valor
              WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) = :reserva THEN -movimento.valor
              ELSE 0
            END
          ),
          0
        )`,
        'total',
      )
      .where('movimento.usuarioId = :usuarioId', { usuarioId })
      .andWhere('movimento.contaId = :contaId', { contaId })
      .andWhere('movimento.periodo = :periodo', { periodo })
      .setParameters({
        receita: CategoriaTipo.RECEITA,
        despesa: CategoriaTipo.DESPESA,
        reserva: CategoriaTipo.RESERVA,
      })
      .getRawOne();

    return Number(resultado?.total ?? 0);
  }

  private async criarMovimentoParcialPorComprovante(
    periodo: string,
    analise: AnaliseComprovanteResultado,
    categoriaId: number | null,
    contaId: number | null,
    comprovanteId: number,
    usuarioId: number,
  ): Promise<Movimento> {
    const movimento = this.movimentoRepository.create({
      usuarioId,
      periodo,
      data: analise.data ? this.parseDataSemTimezone(analise.data) : null,
      descricao: analise.descricao?.trim() || null,
      valor: analise.valor,
      categoriaId,
      contaId,
      revisado: false,
    });

    const movimentoSalvo = await this.movimentoRepository.save(movimento);
    await this.vincularComprovante(comprovanteId, movimentoSalvo.id, usuarioId);
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: 'Movimentação parcial criada a partir de comprovante',
      acao: LogAcao.CREATE,
      entidade: 'Movimento',
      entidadeId: movimentoSalvo.id.toString(),
      dadosNovos: movimentoSalvo,
    });

    return movimentoSalvo;
  }

  private descricoesSemelhantes(
    primeira: string | null,
    segunda: string | null,
  ): boolean {
    const palavrasPrimeira = new Set(
      normalizarTexto(primeira || '')
        .split(' ')
        .filter(Boolean),
    );
    const palavrasSegunda = new Set(
      normalizarTexto(segunda || '')
        .split(' ')
        .filter(Boolean),
    );
    if (!palavrasPrimeira.size || !palavrasSegunda.size) {
      return false;
    }
    const intersecao = [...palavrasPrimeira].filter((palavra) =>
      palavrasSegunda.has(palavra),
    ).length;
    return (
      intersecao / Math.max(palavrasPrimeira.size, palavrasSegunda.size) >= 0.5
    );
  }

  private async existeMovimentoEquivalente(
    usuarioId: number,
    lancamento: AnaliseLancamentoExtrato,
  ): Promise<boolean> {
    if (
      !lancamento.data ||
      lancamento.valor === null ||
      !lancamento.categoriaId
    ) {
      return false;
    }

    const movimentos = await this.movimentoRepository.find({
      where: { usuarioId, periodo: lancamento.data.slice(0, 7) },
    });
    return movimentos.some(
      (movimento) =>
        movimento.categoriaId === lancamento.categoriaId &&
        Number(movimento.valor) === Number(lancamento.valor) &&
        this.descricoesSemelhantes(movimento.descricao, lancamento.descricao),
    );
  }

  private saoDadosDeTransferencia(
    primeiro: AnaliseLancamentoExtrato,
    segundo: AnaliseLancamentoExtrato,
  ): boolean {
    return (
      !!primeiro.data &&
      primeiro.data === segundo.data &&
      primeiro.valor !== null &&
      primeiro.valor === segundo.valor &&
      primeiro.tipo !== null &&
      primeiro.tipo !== segundo.tipo &&
      !!primeiro.contaId &&
      !!segundo.contaId &&
      primeiro.contaId === segundo.contaId
    );
  }

  async calcularSaldoInicialAutomatico(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<number> {
    this.validarPeriodoSaldoInicial(periodo);
    const periodoAnterior = this.getPeriodoAnterior(periodo);
    return this.calcularSaldoFinal(periodoAnterior, contaId, usuarioId);
  }

  async getSaldoInicial(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<SaldoInicial> {
    this.validarPeriodoSaldoInicial(periodo);
    await this.validarConta(contaId, usuarioId);

    return this.resolverSaldoInicial(periodo, contaId, usuarioId);
  }

  async getSaldosIniciais(
    periodo: string,
    usuarioId: number,
  ): Promise<SaldosIniciaisResponse> {
    this.validarPeriodoSaldoInicial(periodo);
    const periodoAnterior = this.getPeriodoAnterior(periodo);
    const resultados = await this.contaRepository
      .createQueryBuilder('conta')
      .leftJoin(
        SaldoInicial,
        'saldoAtual',
        'saldoAtual.contaId = conta.id AND saldoAtual.usuarioId = :usuarioId AND saldoAtual.periodo = :periodo',
        { usuarioId, periodo },
      )
      .leftJoin(
        SaldoInicial,
        'saldoAnterior',
        'saldoAnterior.contaId = conta.id AND saldoAnterior.usuarioId = :usuarioId AND saldoAnterior.periodo = :periodoAnterior',
        { usuarioId, periodoAnterior },
      )
      .leftJoin(
        Movimento,
        'movimento',
        'movimento.contaId = conta.id AND movimento.usuarioId = :usuarioId AND movimento.periodo = :periodoAnterior',
        { usuarioId, periodoAnterior },
      )
      .leftJoin(Categoria, 'categoria', 'categoria.id = movimento.categoriaId')
      .leftJoin(
        OrcamentoItem,
        'orcamentoItem',
        'orcamentoItem.id = movimento.orcamentoItemId',
      )
      .leftJoin(
        Categoria,
        'orcamentoItemCategoria',
        'orcamentoItemCategoria.id = orcamentoItem.categoriaId',
      )
      .select('conta.id', 'contaId')
      .addSelect('conta.nome', 'contaNome')
      .addSelect('saldoAtual.id', 'id')
      .addSelect('saldoAtual.origem', 'origem')
      .addSelect('saldoAtual.criadoPorManual', 'criadoPorManual')
      .addSelect('saldoAtual.createdAt', 'createdAt')
      .addSelect('saldoAtual.updatedAt', 'updatedAt')
      .addSelect(
        `COALESCE(
          saldoAtual.valor,
          COALESCE(saldoAnterior.valor, 0) + COALESCE(
            SUM(
              CASE
                WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) = :receita THEN movimento.valor
                WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) IN (:despesa, :reserva) THEN -movimento.valor
                ELSE 0
              END
            ),
            0
          )
        )`,
        'valor',
      )
      .where('conta.usuarioId = :usuarioId', { usuarioId })
      .setParameters({
        receita: CategoriaTipo.RECEITA,
        despesa: CategoriaTipo.DESPESA,
        reserva: CategoriaTipo.RESERVA,
      })
      .groupBy('conta.id')
      .addGroupBy('conta.nome')
      .addGroupBy('saldoAtual.id')
      .addGroupBy('saldoAtual.valor')
      .addGroupBy('saldoAtual.origem')
      .addGroupBy('saldoAtual.criadoPorManual')
      .addGroupBy('saldoAtual.createdAt')
      .addGroupBy('saldoAtual.updatedAt')
      .addGroupBy('saldoAnterior.valor')
      .orderBy('conta.nome', 'ASC')
      .getRawMany();

    const agora = new Date();
    const saldos = resultados.map((resultado) => ({
      id: resultado.id === null ? null : Number(resultado.id),
      usuarioId,
      contaId: Number(resultado.contaId),
      contaNome: resultado.contaNome,
      periodo,
      valor: Number(resultado.valor ?? 0),
      origem: resultado.origem ?? SaldoInicialOrigem.AUTO,
      criadoPorManual:
        resultado.criadoPorManual === true ||
        Number(resultado.criadoPorManual) === 1,
      createdAt: resultado.createdAt ?? agora,
      updatedAt: resultado.updatedAt ?? agora,
    })) as SaldoInicialContaResponse[];

    return {
      periodo,
      valorTotal: saldos.reduce(
        (total, saldo) => total + Number(saldo.valor),
        0,
      ),
      quantidadeContas: saldos.length,
      saldos,
    };
  }

  async createSaldoInicial(
    periodo: string,
    createSaldoInicialDto: CreateSaldoInicialDto,
    usuarioId: number,
  ): Promise<SaldoInicial> {
    this.validarPeriodoSaldoInicial(periodo);
    const { contaId, valor, origem } = createSaldoInicialDto;
    await this.validarConta(contaId, usuarioId);

    const saldoExistente = await this.encontrarSaldoInicial(
      periodo,
      contaId,
      usuarioId,
    );

    if (saldoExistente) {
      if (origem !== SaldoInicialOrigem.MANUAL) {
        throw new BadRequestException(
          'Saldo inicial já cadastrado para esta conta no período',
        );
      }

      const anterior = {
        valor: saldoExistente.valor,
        origem: saldoExistente.origem,
        createdAt: saldoExistente.createdAt,
        updatedAt: saldoExistente.updatedAt,
      };

      Object.assign(saldoExistente, {
        valor: Number(valor),
        origem: SaldoInicialOrigem.MANUAL,
        criadoPorManual: true,
      });

      const atualizado = await this.saldoInicialRepository.save(saldoExistente);

      await this.logsService.create({
        data: new Date(),
        usuarioId,
        descricao: `Saldo inicial atualizado para ${periodo} na conta ${contaId}`,
        acao: LogAcao.UPDATE,
        entidade: 'SaldoInicial',
        entidadeId: atualizado.id.toString(),
        dadosAnteriores: anterior,
        dadosNovos: {
          valor: atualizado.valor,
          origem: atualizado.origem,
          createdAt: atualizado.createdAt,
          updatedAt: atualizado.updatedAt,
        },
      });

      return atualizado;
    }

    const saldoInicial = this.saldoInicialRepository.create({
      usuarioId,
      contaId,
      periodo,
      valor: Number(valor),
      origem: origem ?? SaldoInicialOrigem.AUTO,
      criadoPorManual: origem === SaldoInicialOrigem.MANUAL,
    });

    const salvo = await this.saldoInicialRepository.save(saldoInicial);

    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Saldo inicial criado para ${periodo} na conta ${contaId}`,
      acao: LogAcao.CREATE,
      entidade: 'SaldoInicial',
      entidadeId: salvo.id.toString(),
      dadosNovos: {
        valor: salvo.valor,
        origem: salvo.origem,
        createdAt: salvo.createdAt,
        updatedAt: salvo.updatedAt,
      },
    });

    return salvo;
  }

  async updateSaldoInicial(
    periodo: string,
    contaId: number,
    updateSaldoInicialDto: UpdateSaldoInicialDto,
    usuarioId: number,
  ): Promise<SaldoInicial> {
    this.validarPeriodoSaldoInicial(periodo);
    const saldoInicial =
      (await this.encontrarSaldoInicial(periodo, contaId, usuarioId)) ||
      (await this.createSaldoInicial(
        periodo,
        {
          contaId,
          valor: await this.calcularSaldoInicialAutomatico(
            periodo,
            contaId,
            usuarioId,
          ),
          origem: SaldoInicialOrigem.AUTO,
        },
        usuarioId,
      ));

    const valor = updateSaldoInicialDto.valor ?? saldoInicial.valor ?? 0;
    const origem =
      updateSaldoInicialDto.origem ??
      saldoInicial.origem ??
      SaldoInicialOrigem.AUTO;

    const anterior = {
      valor: saldoInicial.valor,
      origem: saldoInicial.origem,
      createdAt: saldoInicial.createdAt,
      updatedAt: saldoInicial.updatedAt,
    };

    Object.assign(saldoInicial, {
      valor: Number(valor),
      origem,
      criadoPorManual:
        origem === SaldoInicialOrigem.MANUAL || saldoInicial.criadoPorManual,
    });

    const atualizado = await this.saldoInicialRepository.save(saldoInicial);

    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Saldo inicial atualizado para ${periodo} na conta ${contaId}`,
      acao: LogAcao.UPDATE,
      entidade: 'SaldoInicial',
      entidadeId: atualizado.id.toString(),
      dadosAnteriores: anterior,
      dadosNovos: {
        valor: atualizado.valor,
        origem: atualizado.origem,
        createdAt: atualizado.createdAt,
        updatedAt: atualizado.updatedAt,
      },
    });

    return atualizado;
  }

  async restaurarSaldoInicialAutomatico(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<SaldoInicial> {
    this.validarPeriodoSaldoInicial(periodo);
    await this.validarConta(contaId, usuarioId);

    const saldoInicial = await this.getSaldoInicial(
      periodo,
      contaId,
      usuarioId,
    );
    const anterior = {
      valor: saldoInicial.valor,
      origem: saldoInicial.origem,
      criadoPorManual: saldoInicial.criadoPorManual,
    };

    Object.assign(saldoInicial, {
      valor: await this.calcularSaldoInicialAutomatico(
        periodo,
        contaId,
        usuarioId,
      ),
      origem: SaldoInicialOrigem.AUTO,
      criadoPorManual: false,
    });

    const atualizado = await this.saldoInicialRepository.save(saldoInicial);
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Saldo inicial restaurado para cálculo automático em ${periodo} na conta ${contaId}`,
      acao: LogAcao.UPDATE,
      entidade: 'SaldoInicial',
      entidadeId: atualizado.id?.toString() ?? `${periodo}:${contaId}`,
      dadosAnteriores: anterior,
      dadosNovos: {
        valor: atualizado.valor,
        origem: atualizado.origem,
        criadoPorManual: atualizado.criadoPorManual,
      },
    });

    return atualizado;
  }

  async calcularSaldoFinal(
    periodo: string,
    contaId: number,
    usuarioId: number,
  ): Promise<number> {
    this.validarPeriodoSaldoInicial(periodo);
    const saldoInicial = await this.encontrarSaldoInicial(
      periodo,
      contaId,
      usuarioId,
    );
    const valorSaldoInicial = saldoInicial ? Number(saldoInicial.valor) : 0;
    const valorMovimentos = await this.calcularTotalMovimentosPeriodo(
      periodo,
      contaId,
      usuarioId,
    );

    return valorSaldoInicial + valorMovimentos;
  }

  async backfillSaldosIniciais(
    usuarioId: number,
    contaId?: number,
  ): Promise<SaldoInicial[]> {
    const contas = contaId
      ? [{ id: contaId }]
      : await this.contaRepository.find({ where: { usuarioId } });

    const periodos = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .select('DISTINCT movimento.periodo', 'periodo')
      .where('movimento.usuarioId = :usuarioId', { usuarioId })
      .andWhere(contaId ? 'movimento.contaId = :contaId' : '1 = 1', {
        contaId,
      })
      .orderBy('movimento.periodo', 'ASC')
      .getRawMany();

    const todos: SaldoInicial[] = [];
    for (const conta of contas) {
      for (const item of periodos) {
        const periodo = item.periodo;
        const existente = await this.encontrarSaldoInicial(
          periodo,
          conta.id,
          usuarioId,
        );

        if (existente) {
          continue;
        }

        const valorPadrao = await this.calcularSaldoInicialAutomatico(
          periodo,
          conta.id,
          usuarioId,
        );

        const saldo = this.saldoInicialRepository.create({
          usuarioId,
          contaId: conta.id,
          periodo,
          valor: valorPadrao,
          origem: SaldoInicialOrigem.AUTO,
          criadoPorManual: false,
        });

        todos.push(await this.saldoInicialRepository.save(saldo));
      }
    }

    return todos;
  }

  async analisarExtratos(
    arquivos: ComprovanteUploadFile[],
    usuarioId: number,
  ): Promise<AnalisarComprovantesLoteResponseDto> {
    if (!arquivos.length) {
      throw new BadRequestException('Envie pelo menos um arquivo para análise');
    }

    arquivos.forEach((arquivo) => this.validarArquivoComprovante(arquivo));
    const categorias = await this.categoriaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });
    const contas = await this.contaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });
    const analisados = await Promise.all(
      arquivos.map(async (arquivo) => ({
        arquivo,
        upload: await this.comprovanteStorageService.uploadComprovante(
          usuarioId,
          arquivo,
        ),
        analise: await this.comprovanteAiService.analisarComprovante(
          arquivo,
          categorias,
          contas,
        ),
      })),
    );

    if (analisados.some(({ analise }) => analise.tipoDocumento !== 'extrato')) {
      throw new BadRequestException(
        'O envio em lote aceita apenas extratos bancários. Envie comprovantes individualmente.',
      );
    }

    const todosLancamentos = analisados.flatMap((item, indiceArquivo) =>
      item.analise.lancamentos.map((lancamento, indiceLancamento) => ({
        ...lancamento,
        indiceArquivo,
        indiceLancamento,
      })),
    );
    const transferencias = new Set<string>();
    todosLancamentos.forEach((lancamento, indice) => {
      todosLancamentos.slice(indice + 1).forEach((outro) => {
        if (this.saoDadosDeTransferencia(lancamento, outro)) {
          transferencias.add(
            `${lancamento.indiceArquivo}:${lancamento.indiceLancamento}`,
          );
          transferencias.add(
            `${outro.indiceArquivo}:${outro.indiceLancamento}`,
          );
        }
      });
    });

    const resultados: AnalisarComprovanteResponseDto[] = [];
    let movimentosIgnorados = 0;
    let transferenciasIgnoradas = 0;
    for (const item of analisados) {
      const indiceArquivo = analisados.indexOf(item);
      for (const [
        indiceLancamento,
        lancamento,
      ] of item.analise.lancamentos.entries()) {
        if (transferencias.has(`${indiceArquivo}:${indiceLancamento}`)) {
          transferenciasIgnoradas++;
          continue;
        }
        const categoria = lancamento.categoriaId
          ? categorias.find(
              (itemCategoria) => itemCategoria.id === lancamento.categoriaId,
            ) || null
          : null;
        const conta = lancamento.contaId
          ? contas.find((itemConta) => itemConta.id === lancamento.contaId) ||
            null
          : null;
        if (await this.existeMovimentoEquivalente(usuarioId, lancamento)) {
          movimentosIgnorados++;
          continue;
        }

        const comprovante = await this.comprovanteRepository.save(
          this.comprovanteRepository.create({
            usuarioId,
            movimentoId: null,
            caminhoArquivo: item.upload.caminhoArquivo,
            nomeArquivo: item.arquivo.originalname,
            tipoArquivo: item.arquivo.mimetype,
            tamanhoArquivo: item.arquivo.size,
          }),
        );
        const analise: AnaliseComprovanteResultado = {
          ...lancamento,
          periodo: lancamento.data ? lancamento.data.slice(0, 7) : null,
          tipoDocumento: 'extrato',
          lancamentos: [],
        };
        const camposObrigatoriosFaltantes = [
          !lancamento.data ? 'data' : null,
          lancamento.valor === null ? 'valor' : null,
          !categoria ? 'categoriaId' : null,
        ].filter((campo): campo is string => !!campo);
        const periodo = analise.periodo || this.getPeriodoAtual();
        let movimento: Movimento;
        if (camposObrigatoriosFaltantes.length) {
          movimento = await this.criarMovimentoParcialPorComprovante(
            periodo,
            analise,
            categoria?.id || null,
            conta?.id || null,
            comprovante.id,
            usuarioId,
          );
        } else {
          movimento = await this.create(
            periodo,
            {
              data: lancamento.data!,
              valor: lancamento.valor!,
              descricao:
                lancamento.descricao ||
                'Movimento importado de extrato bancário',
              categoriaId: categoria!.id,
              contaId: conta?.id,
              comprovanteId: comprovante.id,
              revisado: false,
            },
            usuarioId,
          );
        }
        resultados.push({
          comprovanteId: comprovante.id,
          nomeArquivo: comprovante.nomeArquivo,
          tipoArquivo: comprovante.tipoArquivo,
          tamanhoArquivo: comprovante.tamanhoArquivo,
          caminhoArquivo: comprovante.caminhoArquivo,
          sugestao: {
            data: lancamento.data,
            periodo: analise.periodo,
            valor: lancamento.valor,
            descricao: lancamento.descricao,
            categoriaId: categoria?.id || null,
            categoriaNome: categoria?.nome || null,
            contaId: conta?.id || null,
            contaNome: conta?.nome || null,
          },
          camposObrigatoriosFaltantes,
          salvamento: { status: 'criado', movimentoId: movimento.id },
        });
      }
    }
    return {
      resultados,
      movimentosCriados: resultados.length,
      movimentosIgnorados,
      transferenciasIgnoradas,
    };
  }

  async analisarComprovante(
    arquivo: ComprovanteUploadFile,
    usuarioId: number,
    request?: AnalisarComprovanteRequestDto,
  ): Promise<{
    statusCode: 200 | 201 | 202;
    body: AnalisarComprovanteResponseDto;
  }> {
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
      await this.comprovanteAiService.analisarComprovante(
        arquivo,
        categorias,
        contas,
      );

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

    const periodoAlvo =
      request?.periodo || analise.periodo || this.getPeriodoAtual();

    const camposObrigatoriosFaltantes = [
      !analise.data ? 'data' : null,
      analise.valor === null ? 'valor' : null,
      !categoria ? 'categoriaId' : null,
      request?.movimentoId &&
      request?.periodo &&
      analise.periodo &&
      analise.periodo !== request.periodo
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

    if (request?.movimentoId) {
      const movimentoAtual = await this.movimentoRepository.findOne({
        where: { id: request.movimentoId, usuarioId },
      });

      if (!movimentoAtual) {
        throw new NotFoundException(
          'Movimentação não encontrada para atualização automática',
        );
      }

      const periodoAtualizacao = request.periodo || movimentoAtual.periodo;
      const updateDto: UpdateMovimentoDto = {
        revisado: false,
      };

      const dataCompativelComPeriodo =
        !request.periodo ||
        !analise.periodo ||
        analise.periodo === request.periodo;

      if (analise.data && dataCompativelComPeriodo) {
        updateDto.data = analise.data;
      }
      if (analise.valor !== null) {
        updateDto.valor = analise.valor;
      }
      if (categoria) {
        updateDto.categoriaId = categoria.id;
      }
      if (conta) {
        updateDto.contaId = conta.id;
      }

      if (analise.descricao && analise.descricao.trim()) {
        updateDto.descricao = analise.descricao.trim();
      }

      const movimentoAtualizado = await this.update(
        periodoAtualizacao,
        request.movimentoId,
        updateDto,
        usuarioId,
      );

      await this.vincularComprovante(
        comprovante.id,
        movimentoAtualizado.id,
        usuarioId,
      );

      body.salvamento = {
        status: 'atualizado',
        movimentoId: movimentoAtualizado.id,
      };

      return {
        statusCode: 200,
        body,
      };
    }

    if (camposObrigatoriosFaltantes.length > 0) {
      const movimentoParcial = await this.criarMovimentoParcialPorComprovante(
        periodoAlvo,
        analise,
        categoria?.id || null,
        conta?.id || null,
        comprovante.id,
        usuarioId,
      );

      body.salvamento = {
        status: 'criado',
        movimentoId: movimentoParcial.id,
      };

      return {
        statusCode: 201,
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
      revisado: false,
    };

    const movimentoCriado = await this.create(
      periodoAlvo,
      createDto,
      usuarioId,
    );

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
        descricao:
          createMovimentoDto.descricao +
          (createMovimentoDto.parcelas
            ? ` (Parcela ${i + 1}/${createMovimentoDto.parcelas})`
            : ''),
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
      relations: [
        'orcamentoItem',
        'orcamentoItem.categoria',
        'categoria',
        'conta',
        'comprovante',
      ],
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
      const categoria =
        movimento.orcamentoItem?.categoria || movimento.categoria;

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
      relations: [
        'orcamentoItem',
        'orcamentoItem.categoria',
        'categoria',
        'conta',
        'comprovante',
      ],
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
    const [movimentos, saldosIniciais] = await Promise.all([
      this.movimentoRepository.find({
        where: { usuarioId },
        select: { periodo: true },
      }),
      this.saldoInicialRepository.find({
        where: { usuarioId },
        select: { periodo: true },
      }),
    ]);

    return [
      ...new Set(
        [...movimentos, ...saldosIniciais].map(({ periodo }) => periodo),
      ),
    ].sort((primeiro, segundo) => segundo.localeCompare(primeiro));
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

    if (updateMovimentoDto.revisado === true) {
      const data = updateMovimentoDto.data ?? movimento.data;
      const valor = updateMovimentoDto.valor ?? movimento.valor;
      const categoriaId =
        updateMovimentoDto.categoriaId ?? movimento.categoriaId;
      const orcamentoItemId =
        updateMovimentoDto.orcamentoItemId ?? movimento.orcamentoItemId;

      if (
        !data ||
        valor === null ||
        Number(valor) <= 0 ||
        (!categoriaId && !orcamentoItemId)
      ) {
        throw new BadRequestException(
          'Preencha data, valor e categoria antes de marcar a movimentação como revisada',
        );
      }
    }

    const dadosAnteriores = JSON.parse(JSON.stringify(movimento));
    const { orcamentoItem, categoria, conta, ...movimentoData } = movimento;
    Object.assign(movimentoData, updateMovimentoDto);

    const movimentoAtualizado =
      await this.movimentoRepository.save(movimentoData);

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
