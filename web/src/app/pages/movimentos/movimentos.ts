import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiAppearance, TuiButton, TuiDialogService, TuiHint, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiConfirmService, TuiFloatingContainer, TuiTabs, TuiTooltip } from '@taiga-ui/kit';

import { formatPeriod, CurrencyPipe, Movimento, PromptService, FormatPeriodPipe, CategoriaBadgeComponent, Orcamento, ButtonFloatComponent, CategoriaTipo, TimelineComponent, TimelineItem } from '../../shared';
import { OrcamentosCadastroComponent } from './components/cadastro/cadastro';
import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { forkJoin, finalize, map } from 'rxjs';
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
    TuiAvatar,
    CurrencyPipe,
    FormatPeriodPipe,
    TuiTabs,
    CategoriaBadgeComponent,
    TuiTitle,
    TuiCardLarge,
    TuiAppearance,
    TuiHint,
    ButtonFloatComponent,
    TimelineComponent,
    TuiCell,
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

    /** Resolve o tipo da categoria a partir do orcamentoItem ou da categoria direta */
    getCategoriaTipo(mov: Movimento): CategoriaTipo | undefined {
        return mov.orcamentoItem?.categoria?.tipo || mov.categoria?.tipo || undefined;
    }

    /** Resolve o nome da categoria */
    getCategoriaNome(mov: Movimento): string {
        return mov.orcamentoItem?.categoria?.nome || mov.categoria?.nome || '';
    }

    /** Resolve a descrição do item de orçamento (se existir) */
    getOrcamentoItemDescricao(mov: Movimento): string {
        return mov.orcamentoItem?.descricao || '';
    }

    get totalReceitas(): number {
        return this.movimentos()
            .filter(mov => this.getCategoriaTipo(mov) === 'RECEITA')
            .reduce((sum, mov) => sum + Number(mov.valor), 0);
    }

    get totalDespesas(): number {
        return this.movimentos()
            .filter(mov => this.getCategoriaTipo(mov) === 'DESPESA')
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
        return this.totalOrcamentoDespesa - this.totalDespesas;
    }

    loadPeriodos() {
        this.isLoading.set(true);

        // Buscar períodos de orçamentos E de movimentações, mesclar e deduplificar
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
        this.orcamentoService.findByPeriodo(periodo).subscribe({
            next: (orcamento) => {
                this.orcamento.set(orcamento);
            },
            error: (error) => {
                // Se não encontrou orçamento, apenas setar null
                this.orcamento.set(null);
                console.error('Erro ao carregar orçamento:', error);
            }
        });
    }

    loadMovimentos(periodo: string) {
        this.isLoading.set(true);
        this.chosedPeriodo.set(periodo);
        this.loadOrcamento(periodo);
        this.movimentoService.getAll(periodo).subscribe({
            next: (movimentos) => {
                this.movimentos.set(movimentos);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Erro ao carregar movimentações:', error);
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
                    console.error('Erro ao salvar movimento:', error);
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

    readonly timelineItems = computed<TimelineItem[]>(() => {
        return this.movimentos().map(mov => ({
            id: mov.id,
            data: mov.data,
            categoriaTipo: this.getCategoriaTipo(mov) || '',
            categoriaNome: this.getCategoriaNome(mov),
            descricao: (this.getOrcamentoItemDescricao(mov)
                ? this.getOrcamentoItemDescricao(mov) + (mov.descricao ? ' - ' + mov.descricao : '')
                : mov.descricao) || '',
            valor: Number(mov.valor),
            raw: mov,
        }));
    });

    trackByFn(index: number, item: Movimento): string {
        return item.data;
    }
}