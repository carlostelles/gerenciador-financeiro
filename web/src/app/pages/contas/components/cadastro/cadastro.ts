import { ChangeDetectionStrategy, Component, ElementRef, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiForm } from '@taiga-ui/layout';

import { ContaService } from '../../../../core/services/conta.service';
import { Conta } from '../../../../shared/interfaces';

@Component({
  selector: 'app-contas-cadastro',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiForm
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss'
})
export class ContasCadastroComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly contaService = inject(ContaService);
  protected readonly context = injectContext<TuiDialogContext<string, Conta>>();

  protected conta: Conta = this.context.data;

  protected readonly contaForm = this.fb.group({
    nome: [this.conta?.nome || '', [Validators.required, Validators.minLength(2)]]
  });

  constructor(private elementRef: ElementRef<HTMLElement>) {
    // Definir foco no primeiro campo do formulário ao abrir o diálogo
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector('input');
      firstInput?.focus();
    }, 0);
  }

  ngOnChanges() {
    if (this.conta) {
      this.contaForm.patchValue({
        nome: this.conta.nome
      });
    } else {
      this.contaForm.reset();
    }
  }

  saveConta() {
    if (this.contaForm.valid) {
      const formData = this.contaForm.value;
      const contaData = {
        nome: formData.nome!
      };

      if (this.conta) {
        // Editar conta existente
        this.contaService.update(this.conta.id, contaData).subscribe({
          next: () => {
            this.onClose();
            this.contaForm.reset();
          },
          error: (error) => {
            console.error('Erro ao atualizar conta:', error);
          }
        });
      } else {
        // Criar nova conta
        this.contaService.create(contaData).subscribe({
          next: () => {
            this.onClose();
            this.contaForm.reset();
          },
          error: (error) => {
            console.error('Erro ao criar conta:', error);
          }
        });
      }
    }
  }

  onClose() {
    this.context.completeWith('');
  }
}
