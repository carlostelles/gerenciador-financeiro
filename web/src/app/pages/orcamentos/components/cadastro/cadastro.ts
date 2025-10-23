import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { TuiCalendarMonth, TuiInputMonth } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiBooleanHandler } from '@taiga-ui/cdk/types';
import { TuiMonth } from '@taiga-ui/cdk/date-time';

import { OrcamentoService } from '../../../../core/services/orcamento.service';
import { ToastService, Orcamento, CreateOrcamentoDto, UpdateOrcamentoDto } from '../../../../shared';

@Component({
    selector: 'app-orcamentos-cadastro',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        TuiInputMonth,
        TuiCalendarMonth
    ],
    templateUrl: './cadastro.html',
    styleUrls: ['./cadastro.scss']
})
export class OrcamentosCadastroComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly orcamentoService = inject(OrcamentoService);
    private readonly context = inject<TuiDialogContext<string, Orcamento | undefined>>(POLYMORPHEUS_CONTEXT);
    private readonly toast = inject(ToastService);

    protected readonly min = TuiMonth.currentLocal();
    protected readonly disabledItemHandler: TuiBooleanHandler<TuiMonth> = (tuiMonth: TuiMonth) => {
        // Disable months before the current month
        return tuiMonth.monthBefore(TuiMonth.currentLocal()) || 
            this.periodosIndisponiveis().includes(`${tuiMonth.year}-${String(tuiMonth.month + 1).padStart(2, '0')}`);
    };
    protected readonly periodosIndisponiveis = signal<string[]>([]);
    protected readonly isSubmitting = signal<boolean>(false);

    orcamentoForm!: FormGroup;

    get isEditing(): boolean {
        return !!this.context.data;
    }

    ngOnInit() {
        this.loadPeriodosIndisponiveis();
        this.initializeForm();

        if (this.isEditing && this.context.data) {
            this.loadOrcamentoData(this.context.data);
        }
    }

    private initializeForm() {
        this.orcamentoForm = this.fb.group({
            periodo: ['', [Validators.required]],
            descricao: ['', [Validators.maxLength(255)]]
        });
    }

    private loadOrcamentoData(orcamento: Orcamento) {
        const monthParts = orcamento.periodo.split('-');
        let periodo: TuiMonth | null = null;
        if (monthParts.length === 2) {
            const year = parseInt(monthParts[0], 10);
            const month = parseInt(monthParts[1], 10) - 1; // Ajuste para índice baseado em zero
            periodo = new TuiMonth(year, month);
        }
        this.orcamentoForm.patchValue({
            periodo: periodo,
            descricao: orcamento.descricao
        });
        this.orcamentoForm.controls['periodo'].disable();
    }

        private createOrcamento(orcamentoData: CreateOrcamentoDto) {
        this.orcamentoService.create(orcamentoData).subscribe({
            next: () => {
                this.context.completeWith('success');
            },
            error: (error) => {
                console.error('Erro ao criar orçamento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    private updateOrcamento(id: number, orcamentoData: UpdateOrcamentoDto) {
        this.orcamentoService.update(id, orcamentoData).subscribe({
            next: () => {
                this.toast.success('Orçamento atualizado com sucesso!');
                this.context.completeWith('success');
            },
            error: (error) => {
                console.error('Erro ao atualizar orçamento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    private loadPeriodosIndisponiveis() {
        this.orcamentoService.findPeriodos().subscribe({
            next: (periodos) => {
                this.periodosIndisponiveis.set(periodos);
            },
            error: (error) => {
                console.error('Erro ao carregar períodos:', error);
            }
        });
    }

    onSubmit() {
        if (this.orcamentoForm.valid) {
            this.isSubmitting.set(true);
            const orcamentoData = this.orcamentoForm.value;

            if (this.isEditing && this.context.data) {
                this.updateOrcamento(this.context.data.id, orcamentoData);
            } else {
                this.createOrcamento(orcamentoData);
            }
        }
    }

    onCancel() {
        this.context.$implicit.complete();
    }
}