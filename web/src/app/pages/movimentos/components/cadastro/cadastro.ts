import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiNumberFormat, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiDataListWrapper, TuiFilterByInputPipe, TuiInputDate, TuiInputNumber, TuiSelect, TuiSwitch } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDay, TuiIdentityMatcher, TuiMonth, TuiStringHandler, TuiStringMatcher } from '@taiga-ui/cdk';
import { TuiCurrencyPipe } from '@taiga-ui/addon-commerce';
import { TuiForm } from '@taiga-ui/layout';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { ContaService } from '../../../../core/services/conta.service';
import { AnalisarComprovanteResponse, CreateMovimentoDto, ToastService, UpdateMovimentoDto, Movimento, CategoriaBadgeComponent, CategoriaOption, Conta } from '../../../../shared';
import { toUTCDate } from '../../../../shared/helpers/date';

@Component({
    selector: 'app-orcamentos-cadastro',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        TuiInputDate,
        TuiSwitch,
        TuiChevron,
        TuiComboBox,
        TuiFilterByInputPipe,
        TuiDataList,
        TuiDataListWrapper,
        TuiNumberFormat,
        TuiCurrencyPipe,
        TuiInputNumber,
        TuiForm,
        CategoriaBadgeComponent
    ],
    templateUrl: './cadastro.html',
    styleUrls: ['./cadastro.scss']
})
export class OrcamentosCadastroComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly movimentosService = inject(MovimentoService);
    private readonly contaService = inject(ContaService);
    private readonly context = inject<TuiDialogContext<string, Movimento | undefined>>(POLYMORPHEUS_CONTEXT);
    private readonly toast = inject(ToastService);

    movimentoForm!: FormGroup;

    protected readonly periodo = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isAnalyzingReceipt = signal<boolean>(false);
    protected readonly categoriaOptions = signal<CategoriaOption[]>([]);
    protected readonly contas = signal<Conta[]>([]);
    protected readonly uploadedReceiptName = signal<string | null>(null);
    protected readonly uploadedReceiptId = signal<number | null>(null);
    private readonly pendingCategoriaId = signal<number | null>(null);
    protected readonly contaStringify: TuiStringHandler<number> = (id) =>
        this.contas().find((conta) => conta.id === id)?.nome ?? '';
    protected readonly stringify: TuiStringHandler<CategoriaOption> = (option) => {
        const item = this.categoriaOptions().find((o) => this.identityMatcher(o, option));
        if (!item) return '';
        if (item.source === 'orcamento') {
            return (item.descricao ? item.descricao + ' - ' : '') + item.categoriaNome;
        }
        return item.categoriaNome;
    }
    protected readonly matcher: TuiStringMatcher<CategoriaOption> = (item, query) => {
        const label = item.source === 'orcamento'
            ? (item.descricao ? item.descricao + ' - ' : '') + item.categoriaNome
            : item.categoriaNome;
        return label.toLowerCase().includes(query.toLowerCase());
    }
    protected readonly identityMatcher: TuiIdentityMatcher<CategoriaOption> = (a, b) => {
        if (a.source !== b.source) return false;
        if (a.source === 'orcamento' && b.source === 'orcamento') {
            return a.orcamentoItemId === b.orcamentoItemId;
        }
        return a.categoriaId === b.categoriaId;
    }
    protected readonly movimentacao = signal<Movimento | undefined>(this.context.data);

    get isEditing(): boolean {
        return !!this.context.data?.id;
    }

    constructor() {
        effect(() => {
            const data = this.movimentoForm?.get('data')?.value;
            if (data) {
                this.onDataChange(data);
            }
        });
    }

    ngOnInit() {
        this.initializeForm();
        this.loadContas();
    }

    private initializeForm() {
        this.movimentoForm = this.fb.group({
            data: ['', [Validators.required]],
            categoriaOption: ['', [Validators.required]],
            valor: [null, [Validators.required, Validators.min(0.01)]],
            descricao: ['', [Validators.required, Validators.maxLength(255)]],
            contaId: [null],
            parcelado: [false],
            parcelas: [null, [Validators.min(2), Validators.max(99)]]
        });

        if (this.movimentacao()) {
            const dataString = this.movimentacao()!.data;
            const date = toUTCDate(dataString);
            const tuiDay = new TuiDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

            this.movimentoForm.patchValue({
                data: tuiDay,
                valor: this.movimentacao()!.valor,
                descricao: this.movimentacao()!.descricao || ''
            });
        }

        // Subscribe to data field changes
        this.movimentoForm.get('data')?.valueChanges.subscribe((value) => {
            this.onDataChange(value);
        });
    }

    private loadContas() {
        this.contaService.getAll().subscribe({
            next: (contas) => {
                this.contas.set(contas);

                const contaId = this.movimentacao()?.contaId;
                if (contaId) {
                    // Editando: selecionar a conta vinculada ao movimento
                    this.movimentoForm.patchValue({ contaId });
                } else if (!this.context.data?.id && contas.length === 1) {
                    // Criando: se existir apenas uma conta cadastrada, pré-selecioná-la
                    this.movimentoForm.patchValue({ contaId: contas[0].id });
                }
            },
            error: (error) => {
                console.error('Erro ao carregar contas:', error);
            }
        });
    }

    // Quando alterar o campo data, carregar categorias mescladas daquele período
    onDataChange(data: TuiMonth) {
        const periodo = data ? `${data.year}-${String(data.month + 1).padStart(2, '0')}` : null;
        this.periodo.set(periodo || '');
        if (periodo) {
            this.loadCategoriasForPeriodo(periodo);
        }
    }

    private loadCategoriasForPeriodo(periodo: string) {
        this.isSubmitting.set(true);
        this.movimentosService.findCategoriasForPeriodo(periodo)
            .subscribe({
                next: (response) => {
                    // Mesclar itens do orçamento e categorias diretas em uma lista única
                    const allOptions: CategoriaOption[] = [
                        ...response.orcamentoItens,
                        ...response.categorias,
                    ].sort((a, b) => a.categoriaNome.localeCompare(b.categoriaNome));

                    this.categoriaOptions.set(allOptions);

                    // Se editando, selecionar a opção correspondente
                    if (this.movimentacao()) {
                        const mov = this.movimentacao()!;
                        let selectedOption: CategoriaOption | undefined;

                        if (mov.orcamentoItemId) {
                            selectedOption = allOptions.find(
                                (o) => o.source === 'orcamento' && o.orcamentoItemId === mov.orcamentoItemId
                            );
                        }
                        if (!selectedOption && mov.categoriaId) {
                            selectedOption = allOptions.find(
                                (o) => o.categoriaId === mov.categoriaId
                            );
                        }

                        if (selectedOption) {
                            this.movimentoForm.patchValue({ categoriaOption: selectedOption });
                        }
                    } else if (this.pendingCategoriaId()) {
                        const selectedOption = allOptions.find(
                            (option) => option.categoriaId === this.pendingCategoriaId()
                        );

                        if (selectedOption) {
                            this.movimentoForm.patchValue({ categoriaOption: selectedOption });
                        } else {
                            this.movimentoForm.get('categoriaOption')?.markAsTouched();
                        }

                        this.pendingCategoriaId.set(null);
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar categorias por período:', error);
                    this.isSubmitting.set(false);
                },
                complete: () => {
                    this.isSubmitting.set(false);
                }
            });
    }

    onSubmit() {
        if (this.isSubmitting() || this.isAnalyzingReceipt()) {
            return;
        }

        if (this.movimentoForm.valid) {
            this.isSubmitting.set(true);
            const { categoriaOption, ...rest } = this.movimentoForm.value;

            const movimentoData: CreateMovimentoDto = {
                ...rest,
                comprovanteId: this.uploadedReceiptId() ?? undefined,
            };

            // Se a opção selecionada veio do orçamento, enviar orcamentoItemId
            // Caso contrário, enviar categoriaId diretamente
            if (categoriaOption.source === 'orcamento') {
                movimentoData.orcamentoItemId = categoriaOption.orcamentoItemId;
                movimentoData.categoriaId = categoriaOption.categoriaId;
            } else {
                movimentoData.categoriaId = categoriaOption.categoriaId;
            }
    
            if (this.isEditing && this.context.data) {
                this.updateMovimento(this.context.data.id!, movimentoData);
            } else {
                this.createMovimento(movimentoData);
            }
        }
    }

    onReceiptSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const arquivo = input.files?.[0];

        if (!arquivo) {
            return;
        }

        this.isAnalyzingReceipt.set(true);
        this.movimentosService.analisarComprovante(arquivo, {
            periodo: this.periodo() || undefined,
            movimentoId: this.movimentacao()?.id,
        }).subscribe({
            next: (response) => {
                if (!response.body) {
                    this.toast.error('Resposta inválida ao analisar comprovante.');
                    return;
                }

                if (response.status === 201 || response.status === 200) {
                    this.toast.success(
                        response.status === 201
                            ? 'Movimento cadastrado com sucesso!'
                            : 'Movimento atualizado com sucesso!',
                    );
                    this.context.completeWith('success');
                    input.value = '';
                    return;
                }

                this.applyReceiptAnalysis(response.body);
                input.value = '';
            },
            error: (error) => {
                console.error('Erro ao analisar comprovante:', error);
                this.toast.error('Não foi possível analisar o comprovante enviado.');
                this.isAnalyzingReceipt.set(false);
                input.value = '';
            },
            complete: () => {
                this.isAnalyzingReceipt.set(false);
            },
        });
    }

    private applyReceiptAnalysis(response: AnalisarComprovanteResponse) {
        const { sugestao, camposObrigatoriosFaltantes } = response;

        this.uploadedReceiptId.set(response.comprovanteId);
        this.uploadedReceiptName.set(response.nomeArquivo);
        this.pendingCategoriaId.set(sugestao.categoriaId);

        this.movimentoForm.patchValue({
            valor: sugestao.valor,
            descricao: sugestao.descricao ?? '',
            contaId: sugestao.contaId,
            parcelado: false,
            parcelas: null,
        });

        if (sugestao.data) {
            const [year, month, day] = sugestao.data.split('-').map(Number);
            this.movimentoForm.patchValue({
                data: new TuiDay(year, month - 1, day),
            });
        } else {
            this.movimentoForm.get('data')?.setValue(null);
        }

        if (!sugestao.categoriaId) {
            this.movimentoForm.get('categoriaOption')?.setValue(null);
        }

        this.applyRequiredFieldFeedback(camposObrigatoriosFaltantes);

    }

    private applyRequiredFieldFeedback(camposObrigatoriosFaltantes: string[]) {
        const campos = {
            data: this.movimentoForm.get('data'),
            valor: this.movimentoForm.get('valor'),
            categoriaId: this.movimentoForm.get('categoriaOption'),
        };

        Object.entries(campos).forEach(([campo, control]) => {
            if (!control) {
                return;
            }

            if (camposObrigatoriosFaltantes.includes(campo)) {
                control.markAsTouched();
                control.updateValueAndValidity();
            }
        });
    }

    private createMovimento(movimentoData: CreateMovimentoDto) {
        this.movimentosService.create(this.periodo(), movimentoData).subscribe({
            next: () => {
                this.toast.success('Movimento cadastrado com sucesso!');
                this.context.completeWith('success');
            },
            error: (error) => {
                console.error('Erro ao criar movimento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    private updateMovimento(id: number, movimentoData: UpdateMovimentoDto) {
        this.movimentosService.update(this.periodo(), id, movimentoData).subscribe({
            next: () => {
                this.toast.success('Movimento atualizado com sucesso!');
                this.context.completeWith('success');
            },
            error: (error) => {
                console.error('Erro ao atualizar movimento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    onCancel() {
        this.context.$implicit.complete();
    }
}