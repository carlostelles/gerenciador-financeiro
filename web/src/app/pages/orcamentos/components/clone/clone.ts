import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { TuiCalendarMonth, TuiInputMonth } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiBooleanHandler } from '@taiga-ui/cdk/types';
import { TuiMonth } from '@taiga-ui/cdk/date-time';
import { TuiForm } from '@taiga-ui/layout';


import { OrcamentoService } from '../../../../core/services/orcamento.service';
import { Orcamento, CloneOrcamentoDto, FormatPeriodPipe, ToastService } from '../../../../shared';

@Component({
    selector: 'app-orcamentos-clone',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        TuiInputMonth,
        TuiCalendarMonth,
        FormatPeriodPipe,
        TuiForm
    ],
    templateUrl: './clone.html',
    styleUrls: ['./clone.scss']
})
export class OrcamentosCloneComponent implements OnInit {
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
    protected readonly orcamento = signal<Orcamento>(this.context.data!);
    protected readonly periodosIndisponiveis = signal<string[]>([]);
    protected readonly isSubmitting = signal<boolean>(false);

    cloneForm!: FormGroup;

    ngOnInit() {
        this.loadPeriodosIndisponiveis();
        this.initializeForm();
    }

    private initializeForm() {
        this.cloneForm = this.fb.group({
            id: [this.orcamento().id],
            periodo: ['', [Validators.required]],
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
        if (this.cloneForm.valid) {
            this.isSubmitting.set(true);
            const cloneData = this.cloneForm.value;
            this.cloneOrcamento(cloneData);
        }
    }

    private cloneOrcamento(orcamentoData: CloneOrcamentoDto) {
        const monthParts = orcamentoData.periodo as unknown as TuiMonth;
        const formattedPeriod = `${monthParts.year}-${String(monthParts.month + 1).padStart(2, '0')}`;
        this.orcamentoService.clone(orcamentoData.id, formattedPeriod).subscribe({
            next: () => {
                this.toast.success('Orçamento clonado com sucesso!');
                this.context.completeWith('success');
            },
            error: (error) => {
                console.error('Erro ao clonar orçamento:', error);
                this.isSubmitting.set(false);
            }
        });
    }

    onCancel() {
        this.context.$implicit.complete();
    }
}