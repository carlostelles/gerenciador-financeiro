import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiAppearance, TuiButton, TuiDialogService, TuiHint, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiConfirmService, TuiTabs, TuiTooltip } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';

import { formatPeriod, CurrencyPipe, Movimento, PromptService, FormatPeriodPipe, CategoriaBadgeComponent, Orcamento } from '../../shared';
import { OrcamentosCadastroComponent } from './components/cadastro/cadastro';
import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { finalize, map } from 'rxjs';
import { TuiBlockDetails, TuiCardLarge, TuiCell } from '@taiga-ui/layout';

@Component({
    selector: 'app-movimentos',
    standalone: true,
    imports: [
    CommonModule,
    TuiButton,
    TuiBadge,
    TuiIcon,
    TuiTooltip,
    TuiTable,
    TuiTableControl,
    TuiCell,
    TuiAvatar,
    CurrencyPipe,
    FormatPeriodPipe,
    TuiTabs,
    CategoriaBadgeComponent,
    TuiTitle,
    TuiCardLarge,
    TuiAppearance,
    CurrencyPipe,
    TuiHint
],
    providers: [TuiConfirmService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './movimentos.html',
    styleUrls: ['./movimentos.scss']
})
export class MovimentosComponent implements OnInit {
    private readonly movimentoService = inject(MovimentoService);
    private readonly orcamentoService = inject(OrcamentoService);
    private readonly promptService = inject(PromptService);
    private readonly dialogs = inject(TuiDialogService);

    protected activeItemIndex = 0;
    protected readonly isLoading = signal<boolean>(false);
    protected readonly chosedPeriodo = signal<string | undefined>(undefined);
    protected readonly periodos = signal<string[]>([]);
    protected readonly movimentos = signal<Movimento[]>([]);
    protected readonly orcamento = signal<Orcamento | null>(null);

    ngOnInit() {
        this.loadPeriodos();
    }

    get currentPeriodo(): string {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    get totalReceitas(): number {
        return this.movimentos()
            .filter(mov => mov.orcamentoItem.categoria.tipo === 'RECEITA')
            .reduce((sum, mov) => sum + Number(mov.valor), 0);
    }

    get totalDespesas(): number {
        return this.movimentos()
            .filter(mov => mov.orcamentoItem.categoria.tipo === 'DESPESA')
            .reduce((sum, mov) => sum + Number(mov.valor), 0);
    }

    get saldo(): number {
        return this.totalReceitas - this.totalDespesas;
    }

    get totalOrcamentoDespesa(): number {
        return this.orcamento()?.items
            .filter(item => item.categoria.tipo === 'DESPESA')
            .reduce((sum, item) => sum + Number(item.valor), 0) || 0;
    }

    get totalOrcamentoReceita(): number {
        return this.orcamento()?.items
            .filter(item => item.categoria.tipo === 'RECEITA')
            .reduce((sum, item) => sum + Number(item.valor), 0) || 0;
    }

    get saldoOrcamento(): number {
        console.log(this.totalOrcamentoDespesa, this.totalDespesas);
        return this.totalOrcamentoDespesa - this.totalDespesas;
    }

    loadPeriodos() {
        this.isLoading.set(true);
        this.orcamentoService.findPeriodos()
            .pipe(
                finalize(() => this.isLoading.set(false)),
                map((periodos) => {
                    if (!periodos.includes(this.currentPeriodo)) {
                        periodos.push(this.currentPeriodo);
                    }
                    return periodos.sort();
                })
            )
            .subscribe({
                next: (periodos) => {
                    this.periodos.set(periodos);

                    if (periodos.length > 0 && !this.chosedPeriodo()) {
                        this.activeItemIndex = periodos.indexOf(this.chosedPeriodo() || this.currentPeriodo);
                        this.chosedPeriodo.set(this.currentPeriodo);
                        this.loadMovimentos(this.chosedPeriodo()!);
                        this.loadOrcamento(this.chosedPeriodo()!);
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar períodos:', error);
                }
            });
    }

    loadOrcamento(periodo: string) {
        this.isLoading.set(true);
        this.orcamentoService.findByPeriodo(periodo).subscribe({
            next: (orcamento) => {
                this.orcamento.set(orcamento);
            },
            error: (error) => {
                console.error('Erro ao carregar orçamentos:', error);
                this.isLoading.set(false);
            },
            complete: () => {
                this.isLoading.set(false);
            }
        });
    }

    loadMovimentos(periodo: string) {
        this.isLoading.set(true);
        this.movimentoService.getAll(periodo).subscribe({
            next: (movimentos) => {
                console.log(movimentos);
                this.movimentos.set(movimentos);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Erro ao carregar orçamentos:', error);
                this.isLoading.set(false);
            }
        });
    }

    openFormModal(movimento?: Movimento) {
        this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosCadastroComponent), {
                label: movimento ? 'Editar movimento' : 'Cadastrar movimento',
                size: 'm',
                data: movimento,
            })
            .subscribe({
                next: () => {
                    this.loadMovimentos(movimento?.periodo ?? this.chosedPeriodo()!);
                },
                error: (error) => {
                    console.error('Erro ao salvar orçamento:', error);
                }
            });
    }

    confirmDelete(movimento: Movimento) {
        this.promptService
            .open(`O movimento <strong>${movimento.descricao}</strong> do período <strong>${formatPeriod(movimento.periodo)}</strong> será excluído. Esta ação não pode ser desfeita.`, {
                heading: 'Confirmação de Exclusão',
                buttons: [
                    { label: 'Excluir', appearance: 'accent', icon: 'trash' },
                    { label: 'Cancelar', appearance: 'outline' }
                ]
            })
            .subscribe((result) => {
                if (result) {
                    this.movimentoService.delete(movimento.periodo, movimento.id).subscribe({
                        next: () => {
                            this.loadMovimentos(movimento.periodo);
                        },
                        error: (error) => {
                            console.error('Erro ao excluir movimento:', error);
                        }
                    });
                }
            });
    }

    trackByFn(index: number, item: Movimento): string {
        return item.data;
    }
}