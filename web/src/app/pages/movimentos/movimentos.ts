import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiAppearance, TuiButton, TuiDataList, TuiDialogService, TuiHint, TuiLoader, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import {TuiAccordion} from '@taiga-ui/experimental';
import { TuiAvatar, TuiBadge, TuiChevron, TuiComboBox, TuiConfirmService, TuiTabs } from '@taiga-ui/kit';
import { TuiStringHandler } from '@taiga-ui/cdk';

import { formatPeriod, Conta, CurrencyPipe, Movimento, MovimentoFiltro, PromptService, FormatPeriodPipe, Orcamento, ButtonFloatComponent, CategoriaTipo, TimelineComponent, TimelineItem, getTodayUTC, isTodayUTC, isFutureUTC, isPastUTC, SaldoInicial, ToastService } from '../../shared';
import { OrcamentosCadastroComponent } from './components/cadastro/cadastro';
import { SaldoInicialDialogComponent } from './components/saldo-inicial-dialog/saldo-inicial-dialog';
import { VisualizarComprovanteComponent } from './components/visualizar-comprovante/visualizar-comprovante';
import { MovimentosFiltroComponent } from './components/filtro/filtro';
import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { ContaService } from '../../core/services/conta.service';
import { forkJoin, finalize, map } from 'rxjs';
import { TuiCardLarge, TuiCell } from '@taiga-ui/layout';
import { NgTemplateOutlet } from '@angular/common';

@Component({
    selector: 'app-movimentos',
    standalone: true,
    imports: [
        TuiButton,
        TuiBadge,
        TuiAvatar,
        CurrencyPipe,
        FormatPeriodPipe,
        TuiTabs,
        TuiTitle,
        TuiCardLarge,
        TuiAppearance,
        TuiHint,
        ButtonFloatComponent,
        TimelineComponent,
        TuiCell,
        TuiAccordion,
        NgTemplateOutlet,
        FormsModule,
        TuiTextfield,
        TuiChevron,
        TuiComboBox,
        TuiDataList,
        TuiLoader,
    ],
    providers: [TuiConfirmService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './movimentos.html',
    styleUrls: ['./movimentos.scss']
})
export class MovimentosComponent implements OnInit {
    private readonly movimentoService = inject(MovimentoService);
    private readonly orcamentoService = inject(OrcamentoService);
    private readonly contaService = inject(ContaService);
    private readonly promptService = inject(PromptService);
    private readonly dialogs = inject(TuiDialogService);
    private readonly toast = inject(ToastService);

    protected activeItemIndex = 0;
    protected readonly isLoading = signal<boolean>(false);
    protected readonly chosedPeriodo = signal<string | undefined>(undefined);
    protected readonly periodos = signal<string[]>([]);
    protected readonly movimentos = signal<Movimento[]>([]);
    protected readonly orcamento = signal<Orcamento | null>(null);
    protected readonly contas = signal<Conta[]>([]);
    protected readonly contaId = signal<number | null>(null);
    protected readonly saldoInicial = signal<SaldoInicial | null>(null);
    protected readonly isSaldoLoading = signal<boolean>(false);
    protected readonly contaStringify: TuiStringHandler<number | null> = (id) =>
        this.contas().find((conta) => conta.id === id)?.nome ?? '';

    protected readonly showFutureItens = signal<boolean>(false);
    protected readonly showTodayItens = signal<boolean>(true);
    protected readonly showPastItens = signal<boolean>(true);

    protected readonly filtro = signal<MovimentoFiltro | undefined>(undefined);
    private scrollPositionBeforeReload: number | null = null;
    private loadRequestId = 0;
    protected readonly hasFiltro = computed<boolean>(() => {
        const f = this.filtro();
        return !!f && (!!f.categoriaId || !!f.contaId || !!f.descricao);
    });

    protected readonly CATEGORIA_TIPO = CategoriaTipo; // Expor enum para template

    ngOnInit() {
        this.loadContas();
    }

    get currentPeriodo(): string {
        const now = getTodayUTC();
        return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    /** Resolve o tipo da categoria a partir do orcamentoItem ou da categoria direta */
    getCategoriaTipo(mov: Movimento): CategoriaTipo | undefined {
        return mov.orcamentoItem?.categoria?.tipo || mov.categoria?.tipo || undefined;
    }

    /** Resolve o nome da categoria */
    getCategoriaNome(mov: Movimento): string {
        return mov.orcamentoItem?.categoria?.nome || mov.categoria?.nome || 'Sem categoria';
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

    get totalReservas(): number {
        return this.movimentos()
            .filter(mov => this.getCategoriaTipo(mov) === 'RESERVA')
            .reduce((sum, mov) => sum + Number(mov.valor), 0);
    }

    get saldo(): number {
        return Number(this.saldoInicial()?.valor ?? 0)
            + this.totalReceitas
            - this.totalDespesas
            - this.totalReservas;
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

    get hasOrcamento(): boolean {
        return this.orcamento() !== null;
    }

    loadContas() {
        this.isLoading.set(true);
        this.contaService.getAll().subscribe({
            next: (contas) => {
                this.contas.set(contas);
                const contaSalva = Number(sessionStorage.getItem('movimentacoes.contaId'));
                const selecionada = contas.find((conta) => conta.id === contaSalva)?.id
                    ?? contas[0]?.id
                    ?? null;
                this.contaId.set(selecionada);
                this.loadPeriodos();
            },
            error: (error) => {
                console.error('Erro ao carregar contas:', error);
                this.isLoading.set(false);
                this.toast.error('Não foi possível carregar suas contas.');
            },
        });
    }

    onContaChange(contaId: number | null) {
        if (contaId === null || contaId === this.contaId()) {
            return;
        }

        this.contaId.set(contaId);
        sessionStorage.setItem('movimentacoes.contaId', String(contaId));
        const periodo = this.chosedPeriodo();
        if (periodo) {
            this.loadMovimentos(periodo);
        }
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
                if (this.chosedPeriodo() === periodo) {
                    this.orcamento.set(orcamento);
                }
            },
            error: (error) => {
                if (this.chosedPeriodo() === periodo) {
                    this.orcamento.set(null);
                    console.error('Erro ao carregar orçamento:', error);
                }
            }
        });
    }

    loadMovimentos(periodo: string) {
        const contaId = this.contaId();
        if (contaId === null) {
            this.loadRequestId++;
            this.movimentos.set([]);
            this.saldoInicial.set(null);
            return;
        }

        const requestId = ++this.loadRequestId;
        this.saveScrollPosition();
        this.isLoading.set(true);
        this.chosedPeriodo.set(periodo);
        this.loadOrcamento(periodo);
        this.loadSaldoInicial(periodo, contaId, requestId);
        this.movimentoService.getAll(periodo, { ...this.filtro(), contaId }).subscribe({
            next: (movimentos) => {
                if (requestId !== this.loadRequestId) {
                    return;
                }
                this.movimentos.set(movimentos);
                this.handleAutoShowFutureItens();
                this.isLoading.set(false);
                this.restoreScrollPosition();
            },
            error: (error) => {
                if (requestId !== this.loadRequestId) {
                    return;
                }
                console.error('Erro ao carregar movimentações:', error);
                this.isLoading.set(false);
                this.scrollPositionBeforeReload = null;
            }
        });
    }

    loadSaldoInicial(periodo: string, contaId: number, requestId: number) {
        this.isSaldoLoading.set(true);
        this.saldoInicial.set(null);
        this.movimentoService.getSaldoInicial(periodo, contaId)
            .pipe(finalize(() => {
                if (requestId === this.loadRequestId) {
                    this.isSaldoLoading.set(false);
                }
            }))
            .subscribe({
                next: (saldoInicial) => {
                    if (requestId === this.loadRequestId) {
                        this.saldoInicial.set(saldoInicial);
                    }
                },
                error: (error) => {
                    if (requestId === this.loadRequestId) {
                        console.error('Erro ao carregar saldo inicial:', error);
                        this.toast.error('Não foi possível carregar o saldo inicial desta conta.');
                    }
                },
            });
    }

    openSaldoInicialModal() {
        const saldoInicial = this.saldoInicial();
        const contaId = this.contaId();
        const periodo = this.chosedPeriodo();
        if (!saldoInicial || contaId === null || !periodo) {
            return;
        }

        this.dialogs.open<SaldoInicial>(
            new PolymorpheusComponent(SaldoInicialDialogComponent),
            {
                label: 'Editar saldo inicial',
                size: 's',
                data: { saldoInicial, contaId, periodo },
            },
        ).subscribe({
            next: (atualizado) => this.saldoInicial.set(atualizado),
        });
    }

    openFiltroModal() {
        this.saveScrollPosition();
        this.dialogs
            .open<MovimentoFiltro | null>(new PolymorpheusComponent(MovimentosFiltroComponent), {
                label: 'Filtrar movimentações',
                size: 'm',
                data: this.filtro(),
            })
            .subscribe({
                next: (resultado) => {
                    this.filtro.set(resultado ?? undefined);
                    this.loadMovimentos(this.chosedPeriodo()!);
                },
                error: (error) => {
                    console.error('Erro ao aplicar filtro:', error);
                    this.scrollPositionBeforeReload = null;
                }
            });
    }

    openFormModal(movimento?: Movimento) {
        this.saveScrollPosition();
        this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosCadastroComponent), {
                label: movimento ? 'Editar movimento' : 'Cadastrar movimento',
                size: 'l',
                data: movimento,
            })
            .subscribe({
                next: () => {
                    this.loadMovimentos(movimento?.periodo ?? this.chosedPeriodo()!);
                },
                error: (error) => {
                    console.error('Erro ao salvar movimento:', error);
                    this.scrollPositionBeforeReload = null;
                }
            });
    }

    duplicateItem(movimento: Movimento) {
        this.saveScrollPosition();
        this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosCadastroComponent), {
                label: 'Duplicar movimento',
                size: 'l',
                data: {
                    ...movimento,
                    id: undefined
                } as Movimento,
            })
            .subscribe({
                next: () => {
                    this.loadMovimentos(movimento?.periodo ?? this.chosedPeriodo()!);
                },
                error: (error) => {
                    console.error('Erro ao salvar movimento:', error);
                    this.scrollPositionBeforeReload = null;
                }
            });
    }

    openAttachmentModal(movimento: Movimento) {
        if (!movimento.comprovante) {
            return;
        }

        this.dialogs
            .open<void>(new PolymorpheusComponent(VisualizarComprovanteComponent), {
                label: movimento.comprovante.nomeArquivo,
                size: 'l',
                data: movimento.comprovante,
            })
            .subscribe();
    }

    markAsReviewed(movimento: Movimento) {
        const camposObrigatoriosPreenchidos =
            !!movimento.data &&
            movimento.valor !== null &&
            Number(movimento.valor) > 0 &&
            !!(movimento.categoriaId || movimento.orcamentoItemId);
        if (!camposObrigatoriosPreenchidos) {
            this.toast.error('Preencha data, valor e categoria antes de marcar a movimentação como revisada.');
            return;
        }

        this.saveScrollPosition();
        this.movimentoService.update(movimento.periodo, movimento.id!, { revisado: true }).subscribe({
            next: () => this.loadMovimentos(movimento.periodo),
            error: (error) => {
                console.error('Erro ao marcar movimentação como revisada:', error);
                this.scrollPositionBeforeReload = null;
            },
        });
    }

    confirmDelete(movimento: Movimento) {
        this.saveScrollPosition();
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
                    this.movimentoService.delete(movimento.periodo, movimento.id!).subscribe({
                        next: () => {
                            this.loadMovimentos(movimento.periodo);
                        },
                        error: (error) => {
                            console.error('Erro ao excluir movimento:', error);
                        }
                    });
                } else {
                    this.scrollPositionBeforeReload = null;
                }
            });
    }

    readonly timelineItems = computed<TimelineItem[]>(() => {
        return this.movimentos().map(mov => ({
            id: mov.id!,
            data: mov.data,
            categoriaTipo: this.getCategoriaTipo(mov) || '',
            categoriaNome: this.getCategoriaNome(mov),
            categoriaAusente: !this.getCategoriaTipo(mov),
            descricao: (this.getOrcamentoItemDescricao(mov)
                ? this.getOrcamentoItemDescricao(mov) + (mov.descricao ? ' - ' + mov.descricao : '')
                : mov.descricao) || '',
            valor: Number(mov.valor),
            revisado: mov.revisado ?? false,
            raw: mov,
        }));
    });

    readonly timelineFutureItems = computed<TimelineItem[]>(() => {
        return this.timelineItems().filter(item => {
            return item.data !== null && isFutureUTC(item.data);
        });
    });

    readonly timelineTodayItems = computed<TimelineItem[]>(() => {
        return this.timelineItems().filter(item => {
            return item.data !== null && isTodayUTC(item.data);
        });
    });

    readonly timelinePastItems = computed<TimelineItem[]>(() => {
        return this.timelineItems().filter(item => {
            return item.data === null || isPastUTC(item.data);
        });
    });

    somaValores(items: TimelineItem[], tipo: CategoriaTipo): number {
        return items
            .filter(item => item.categoriaTipo === tipo)
            .reduce((sum, item) => sum + (item.valor ?? 0), 0);
    }

    handleAutoShowFutureItens() {
        // Se houver itens futuros e eles não estiverem sendo mostrados, mostrar automaticamente
        if (this.timelineFutureItems().length && !this.timelineTodayItems().length && !this.timelinePastItems().length) {
            this.showFutureItens.set(true);
        }
    }

    onClickFutureItens() {
        this.showFutureItens.update(value => !value);
    }

    onClickTodayItens() {
        this.showTodayItens.update(value => !value);
    }

    onClickPastItens() {
        this.showPastItens.update(value => !value);
    }

    trackByFn(index: number, item: Movimento): string {
        return item.data || item.id?.toString() || index.toString();
    }

    private saveScrollPosition() {
        if (this.scrollPositionBeforeReload === null && typeof window !== 'undefined') {
            this.scrollPositionBeforeReload = window.scrollY;
        }
    }

    private restoreScrollPosition() {
        const scrollPosition = this.scrollPositionBeforeReload;
        this.scrollPositionBeforeReload = null;
        if (scrollPosition === null || typeof window === 'undefined') {
            return;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => window.scrollTo({ top: scrollPosition }));
        });
    }
}
