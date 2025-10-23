import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiNumberFormat, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiInputDate, TuiInputNumber, TuiSelect } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDay, TuiMonth, TuiStringHandler } from '@taiga-ui/cdk';
import { TuiCurrencyPipe } from '@taiga-ui/addon-commerce';
import { TuiForm } from '@taiga-ui/layout';

import { OrcamentoService } from '../../../../core/services/orcamento.service';
import { MovimentoService } from '../../../../core/services/movimento.service';
import { CreateMovimentoDto, ToastService, UpdateMovimentoDto, OrcamentoItem, Movimento } from '../../../../shared';
import { CategoriaService } from '../../../../core/services/categoria.service';

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
        TuiChevron,
        TuiSelect,
        TuiDataList,
        TuiDataListWrapper,
        TuiNumberFormat,
        TuiCurrencyPipe,
        TuiInputNumber,
        TuiForm
    ],
    templateUrl: './cadastro.html',
    styleUrls: ['./cadastro.scss']
})
export class OrcamentosCadastroComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly orcamentoService = inject(OrcamentoService);
    private readonly categoriaService = inject(CategoriaService);
    private readonly movimentosService = inject(MovimentoService);
    private readonly context = inject<TuiDialogContext<string, Movimento | undefined>>(POLYMORPHEUS_CONTEXT);
    private readonly toast = inject(ToastService);

    movimentoForm!: FormGroup;

    protected readonly periodo = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly orcamentoItens = signal<OrcamentoItem[]>([]);
    protected readonly stringify: TuiStringHandler<number> = (id) => {
        const item = this.orcamentoItens().find((item) => item.id === id);
        return item ? `${item.categoria?.nome} ${item.descricao ? '- ' + item.descricao : ''}` : '';
    }
    protected readonly movimentacao = signal<Movimento | undefined>(this.context.data);

    get isEditing(): boolean {
        return !!this.context.data;
    }

    ngOnInit() {
        this.initializeForm();
    }

    private initializeForm() {
        this.movimentoForm = this.fb.group({
                data: ['', [Validators.required]],
                orcamentoItemId: ['', [Validators.required]],
                valor: [null, [Validators.required, Validators.min(0.01)]],
                descricao: ['', [Validators.maxLength(255)]]
            });

        console.log('Movimentação para edição:', this.movimentacao());
        if (this.movimentacao()) {
            const dataString = this.movimentacao()!.data;
            const [year, month, day] = dataString.split('-').map(Number);
            const tuiMonth = new TuiDay(year, month - 1, day);

            this.movimentoForm.patchValue({
                data: tuiMonth,
                orcamentoItemId: this.movimentacao()!.orcamentoItemId,
                valor: this.movimentacao()!.valor,
                descricao: this.movimentacao()!.descricao || ''
            });
        }

        // Subscribe to data field changes
        this.movimentoForm.get('data')?.valueChanges.subscribe((value) => {
            console.log('Data alterada:', value);
            this.onDataChange(value);
        });
    }

    // Quando alterar o campo data, carregar o orçamento daquele período
    onDataChange(data: TuiMonth) {
        const periodo = data ? `${data.year}-${String(data.month + 1).padStart(2, '0')}` : null;
        console.log('Data movimentação para edição:', data, periodo);
        this.periodo.set(periodo || '');
        if (periodo) {
            this.loadOrcamentoByPeriodoData(periodo);
        }
    }

    private loadOrcamentoByPeriodoData(periodo: string) {
        this.isSubmitting.set(true);
        this.orcamentoService.findByPeriodo(periodo).subscribe({
            next: (orcamento) => {
                if (orcamento) {
                    this.orcamentoItens.set(orcamento.items || []);
                    console.log('Orçamento encontrado:', orcamento);
                }
            },
            error: (error) => {
                console.error('Erro ao carregar orçamento por período:', error);
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
            const orcamentoData = this.movimentoForm.value;

            if (this.isEditing && this.context.data) {
                this.updateMovimento(this.context.data.id, orcamentoData);
            } else {
                this.createMovimento(orcamentoData);
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
                console.error('Erro ao criar orçamento:', error);
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
                console.error('Erro ao atualizar orçamento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    onCancel() {
        this.context.$implicit.complete();
    }
}