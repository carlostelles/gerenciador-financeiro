import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiNumberFormat, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiDataListWrapper, TuiFilterByInputPipe, TuiInputDate, TuiInputNumber, TuiSelect, TuiSwitch } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDay, TuiIdentityMatcher, TuiMonth, TuiStringHandler, TuiStringMatcher } from '@taiga-ui/cdk';
import { TuiCurrencyPipe } from '@taiga-ui/addon-commerce';
import { TuiForm } from '@taiga-ui/layout';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { CreateMovimentoDto, ToastService, UpdateMovimentoDto, Movimento, CategoriaBadgeComponent, CategoriaOption } from '../../../../shared';

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
    private readonly context = inject<TuiDialogContext<string, Movimento | undefined>>(POLYMORPHEUS_CONTEXT);
    private readonly toast = inject(ToastService);

    movimentoForm!: FormGroup;

    protected readonly periodo = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly categoriaOptions = signal<CategoriaOption[]>([]);
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
        console.log(this.context.data);
        return !!this.context.data?.id;
    }

    ngOnInit() {
        this.initializeForm();
    }

    private initializeForm() {
        this.movimentoForm = this.fb.group({
            data: ['', [Validators.required]],
            categoriaOption: ['', [Validators.required]],
            valor: [null, [Validators.required, Validators.min(0.01)]],
            descricao: ['', [Validators.maxLength(255)]],
            parcelado: [false],
            parcelas: [null, [Validators.min(2), Validators.max(99)]]
        });

        if (this.movimentacao()) {
            const dataString = this.movimentacao()!.data;
            const [year, month, day] = dataString.split('-').map(Number);
            const tuiDay = new TuiDay(year, month - 1, day);

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
        if (this.movimentoForm.valid) {
            this.isSubmitting.set(true);
            const { categoriaOption, ...rest } = this.movimentoForm.value;

            const movimentoData: CreateMovimentoDto = {
                ...rest
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