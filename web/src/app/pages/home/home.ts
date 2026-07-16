import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, WritableSignal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiHint, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox } from '@taiga-ui/kit';
import { TuiDataList } from '@taiga-ui/core';
import { TuiAxes, TuiBarChart, TuiLegendItem, TuiRingChart } from '@taiga-ui/addon-charts';
import { TuiHovered, TuiStringHandler } from '@taiga-ui/cdk';
import { forkJoin, finalize, map } from 'rxjs';

import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { ContaService } from '../../core/services/conta.service';
import { Conta, CurrencyPipe, FormatPeriodPipe, ResumoCategoriaItem, ResumoPorCategoriaResponse, ComparativoPorTipoResponse, formatPeriod, getTodayUTC } from '../../shared';

const RESUMO_VAZIO: ResumoPorCategoriaResponse = {
  receitas: [],
  despesas: [],
  reservas: [],
};

const COMPARATIVO_VAZIO: ComparativoPorTipoResponse = {
  periodos: [],
  receitas: [],
  despesas: [],
  reservas: [],
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    TuiTextfield,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiHint,
    TuiLegendItem,
    TuiRingChart,
    TuiAxes,
    TuiBarChart,
    TuiHovered,
    CurrencyPipe,
    FormatPeriodPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  private readonly movimentoService = inject(MovimentoService);
  private readonly orcamentoService = inject(OrcamentoService);
  private readonly contaService = inject(ContaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(false);
  protected readonly periodos = signal<string[]>([]);
  protected readonly contas = signal<Conta[]>([]);
  protected readonly chosedPeriodo = signal<string | undefined>(undefined);
  protected readonly contaId = signal<number | null>(null);
  protected readonly resumo = signal<ResumoPorCategoriaResponse>(RESUMO_VAZIO);
  protected readonly comparativo = signal<ComparativoPorTipoResponse>(COMPARATIVO_VAZIO);

  protected readonly comparativoLabels = ['Receitas', 'Despesas', 'Reservas'];
  protected readonly isSmallScreen = signal<boolean>(false);

  protected readonly comparativoValue = computed<number[][]>(() => {
    const { receitas, despesas, reservas } = this.comparativo();
    return [receitas, despesas, reservas];
  });

  protected readonly comparativoValueResponsive = computed<number[][]>(() => {
    if (!this.isSmallScreen()) {
      return this.comparativoValue();
    }

    return this.transposeValues(this.comparativoValue());
  });

  protected readonly comparativoMax = computed<number>(() => {
    const max = Math.max(0, ...this.comparativoValue().flat());
    return max || 1;
  });

  protected readonly comparativoAxisXLabels = computed<string[]>(() =>
    this.comparativo().periodos.map((periodo) => formatPeriod(periodo)),
  );

  protected readonly comparativoAxisXLabelsResponsive = computed<string[]>(() =>
    this.isSmallScreen() ? this.comparativoLabels : this.comparativoAxisXLabels(),
  );

  protected readonly activeReceita = signal<number>(Number.NaN);
  protected readonly activeDespesa = signal<number>(Number.NaN);
  protected readonly activeReserva = signal<number>(Number.NaN);

  protected readonly periodoStringify: TuiStringHandler<string> = (periodo) =>
    periodo ? formatPeriod(periodo) : '';

  protected readonly contaStringify: TuiStringHandler<number | null> = (id) => {
    if (id === null) {
      return 'Todas as contas';
    }
    return this.contas().find((conta) => conta.id === id)?.nome ?? '';
  };

  protected readonly totalReceitas = computed(() => this.somar(this.resumo().receitas));
  protected readonly totalDespesas = computed(() => this.somar(this.resumo().despesas));
  protected readonly totalReservas = computed(() => this.somar(this.resumo().reservas));

  protected readonly valoresReceitas = computed(() => this.resumo().receitas.map((item) => item.total));
  protected readonly valoresDespesas = computed(() => this.resumo().despesas.map((item) => item.total));
  protected readonly valoresReservas = computed(() => this.resumo().reservas.map((item) => item.total));

  private somar(itens: ResumoCategoriaItem[]): number {
    return itens.reduce((sum, item) => sum + Number(item.total), 0);
  }

  get currentPeriodo(): string {
    const now = getTodayUTC();
    return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  }

  ngOnInit() {
    this.setupResponsiveComparativo();
    this.loadContas();
    this.loadPeriodos();
    this.loadComparativo();
  }

  private setupResponsiveComparativo() {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia('(max-width: 48rem)');
    this.isSmallScreen.set(query.matches);

    const update = (event: MediaQueryListEvent) => this.isSmallScreen.set(event.matches);
    query.addEventListener('change', update);

    this.destroyRef.onDestroy(() => {
      query.removeEventListener('change', update);
    });
  }

  private transposeValues(values: ReadonlyArray<readonly number[]>): number[][] {
    if (!values.length || !values[0]?.length) {
      return [];
    }

    return values[0].map((_, index) => values.map((serie) => serie[index] ?? 0));
  }

  protected comparativoHintTitle(index: number): string {
    if (!this.isSmallScreen()) {
      return this.comparativoAxisXLabels()[index] || '';
    }

    return this.comparativoLabels[index] || '';
  }

  protected comparativoHintValues(index: number): Array<{ label: string; value: number }> {
    const comparativo = this.comparativo();

    if (!this.isSmallScreen()) {
      return [
        { label: 'Receitas', value: comparativo.receitas[index] ?? 0 },
        { label: 'Despesas', value: comparativo.despesas[index] ?? 0 },
        { label: 'Reservas', value: comparativo.reservas[index] ?? 0 },
      ];
    }

    const periodos = this.comparativoAxisXLabels();

    if (index === 0) {
      return periodos.map((label, i) => ({ label, value: comparativo.receitas[i] ?? 0 }));
    }

    if (index === 1) {
      return periodos.map((label, i) => ({ label, value: comparativo.despesas[i] ?? 0 }));
    }

    return periodos.map((label, i) => ({ label, value: comparativo.reservas[i] ?? 0 }));
  }

  loadComparativo() {
    this.movimentoService.findComparativoPorTipo().subscribe({
      next: (comparativo) => this.comparativo.set(comparativo),
      error: (error) => {
        console.error('Erro ao carregar comparativo de movimentações:', error);
        this.comparativo.set(COMPARATIVO_VAZIO);
      },
    });
  }

  loadContas() {
    this.contaService.getAll().subscribe({
      next: (contas) => this.contas.set(contas),
      error: (error) => console.error('Erro ao carregar contas:', error),
    });
  }

  loadPeriodos() {
    this.isLoading.set(true);

    forkJoin([
      this.orcamentoService.findPeriodos(),
      this.movimentoService.findPeriodos(),
    ])
      .pipe(
        finalize(() => this.isLoading.set(false)),
        map(([periodosOrcamento, periodosMovimento]) => {
          const allPeriodos = new Set([...periodosOrcamento, ...periodosMovimento]);
          if (!allPeriodos.has(this.currentPeriodo)) {
            allPeriodos.add(this.currentPeriodo);
          }
          return Array.from(allPeriodos).sort();
        })
      )
      .subscribe({
        next: (periodos) => {
          this.periodos.set(periodos);

          if (periodos.length > 0) {
            this.loadResumo(this.currentPeriodo);
          }
        },
        error: (error) => console.error('Erro ao carregar períodos:', error),
      });
  }

  loadResumo(periodo: string) {
    this.isLoading.set(true);
    this.chosedPeriodo.set(periodo);

    this.movimentoService
      .findResumoPorCategoria(periodo, this.contaId() ?? undefined)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (resumo) => this.resumo.set(resumo),
        error: (error) => {
          console.error('Erro ao carregar resumo de movimentações:', error);
          this.resumo.set(RESUMO_VAZIO);
        },
      });
  }

  onPeriodoChange(periodo: string | null) {
    if (periodo) {
      this.loadResumo(periodo);
    }
  }

  onContaChange(contaId: number | null) {
    this.contaId.set(contaId);

    if (this.chosedPeriodo()) {
      this.loadResumo(this.chosedPeriodo()!);
    }
  }

  onHover(active: WritableSignal<number>, index: number, isHovered: boolean) {
    active.set(isHovered ? index : Number.NaN);
  }
}
