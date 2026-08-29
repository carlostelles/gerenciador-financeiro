import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { TuiButton, TuiDialogContext, TuiDialogService, TuiLoader } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { CurrencyPipe, SaldoInicialConta, SaldosIniciaisResponse, ToastService } from '../../../../shared';
import { SaldoInicialDialogComponent } from '../saldo-inicial-dialog/saldo-inicial-dialog';

export interface SaldosIniciaisDialogData {
  periodo: string;
  agregado: SaldosIniciaisResponse;
}

@Component({
  selector: 'app-saldos-iniciais-dialog',
  standalone: true,
  imports: [CurrencyPipe, TuiBadge, TuiButton, TuiLoader],
  templateUrl: './saldos-iniciais-dialog.html',
  styleUrl: './saldos-iniciais-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaldosIniciaisDialogComponent {
  private readonly movimentoService = inject(MovimentoService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(ToastService);
  protected readonly context = inject<
    TuiDialogContext<void, SaldosIniciaisDialogData>
  >(POLYMORPHEUS_CONTEXT);
  protected readonly agregado = signal(this.context.data.agregado);
  protected readonly isLoading = signal(false);
  protected readonly contaEmAtualizacao = signal<number | null>(null);

  editar(saldoInicial: SaldoInicialConta) {
    this.dialogs.open(
      new PolymorpheusComponent(SaldoInicialDialogComponent),
      {
        label: `Editar saldo inicial - ${saldoInicial.contaNome}`,
        size: 's',
        data: {
          saldoInicial,
          contaId: saldoInicial.contaId,
          periodo: this.context.data.periodo,
        },
      },
    ).subscribe({
      next: () => this.recarregar(),
    });
  }

  restaurar(saldoInicial: SaldoInicialConta) {
    this.contaEmAtualizacao.set(saldoInicial.contaId);
    this.movimentoService.restaurarSaldoInicialAutomatico(
      this.context.data.periodo,
      saldoInicial.contaId,
    ).pipe(finalize(() => this.contaEmAtualizacao.set(null))).subscribe({
      next: () => {
        this.toast.success('Cálculo automático restaurado.');
        this.recarregar();
      },
      error: () => this.toast.error('Não foi possível restaurar o cálculo automático.'),
    });
  }

  private recarregar() {
    this.isLoading.set(true);
    this.movimentoService.getSaldosIniciais(this.context.data.periodo)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (agregado) => this.agregado.set(agregado),
        error: () => this.toast.error('Não foi possível recarregar os saldos iniciais.'),
      });
  }
}
