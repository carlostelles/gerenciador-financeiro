import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiCurrencyPipe } from '@taiga-ui/addon-commerce';
import { TuiButton, TuiDialogContext, TuiNumberFormat, TuiTextfield } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { finalize } from 'rxjs';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { CurrencyPipe, SaldoInicial, ToastService } from '../../../../shared';

export interface SaldoInicialDialogData {
  saldoInicial: SaldoInicial;
  contaId: number;
  periodo: string;
}

@Component({
  selector: 'app-saldo-inicial-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TuiButton,
    TuiCurrencyPipe,
    TuiForm,
    TuiInputNumber,
    TuiNumberFormat,
    TuiTextfield,
  ],
  templateUrl: './saldo-inicial-dialog.html',
  styleUrl: './saldo-inicial-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaldoInicialDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly movimentoService = inject(MovimentoService);
  private readonly toast = inject(ToastService);
  protected readonly context = inject<
    TuiDialogContext<SaldoInicial, SaldoInicialDialogData>
  >(POLYMORPHEUS_CONTEXT);
  protected readonly isSubmitting = signal(false);
  protected readonly form = this.fb.group({
    valor: [this.context.data.saldoInicial.valor, [Validators.required]],
  });

  salvar() {
    const valor = this.form.controls.valor.value;
    if (this.form.invalid || valor === null) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.movimentoService.updateSaldoInicial(
      this.context.data.periodo,
      this.context.data.contaId,
      valor,
    ).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (saldoInicial) => {
        this.toast.success('Saldo inicial atualizado.');
        this.context.completeWith(saldoInicial);
      },
      error: () => this.toast.error('Não foi possível atualizar o saldo inicial.'),
    });
  }

  restaurarAutomatico() {
    this.isSubmitting.set(true);
    this.movimentoService.restaurarSaldoInicialAutomatico(
      this.context.data.periodo,
      this.context.data.contaId,
    ).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (saldoInicial) => {
        this.toast.success('Cálculo automático restaurado.');
        this.context.completeWith(saldoInicial);
      },
      error: () => this.toast.error('Não foi possível restaurar o cálculo automático.'),
    });
  }

  cancelar() {
    this.context.$implicit.complete();
  }
}
