import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiComboBox, TuiTabs } from '@taiga-ui/kit';
import { TuiDataList } from '@taiga-ui/core';
import { TuiLegendItem, TuiRingChart } from '@taiga-ui/addon-charts';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { forkJoin, finalize, map } from 'rxjs';

import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { ContaService } from '../../core/services/conta.service';
import { Conta, CurrencyPipe, FormatPeriodPipe, ResumoCategoriaItem, ResumoPorCategoriaResponse, getTodayUTC } from '../../shared';

const RESUMO_VAZIO: ResumoPorCategoriaResponse = {
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
    TuiBadge,
    TuiTabs,
    TuiLegendItem,
    TuiRingChart,
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

  protected activeItemIndex = 0;
  protected readonly isLoading = signal<boolean>(false);
  protected readonly periodos = signal<string[]>([]);
  protected readonly contas = signal<Conta[]>([]);
  protected readonly chosedPeriodo = signal<string | undefined>(undefined);
  protected readonly contaId = signal<number | null>(null);
  protected readonly resumo = signal<ResumoPorCategoriaResponse>(RESUMO_VAZIO);

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
    this.loadContas();
    this.loadPeriodos();
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
            this.activeItemIndex = periodos.indexOf(this.currentPeriodo);
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

  onContaChange(contaId: number | null) {
    this.contaId.set(contaId);

    if (this.chosedPeriodo()) {
      this.loadResumo(this.chosedPeriodo()!);
    }
  }
}
