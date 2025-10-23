import { ChangeDetectionStrategy, Component, ElementRef, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiChip } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';

import { CategoriaService } from '../../../../core/services/categoria.service';
import { Categoria, CategoriaTipo } from '../../../../shared/interfaces';

@Component({
  selector: 'app-categorias-cadastro',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiChip,
    TuiForm
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss'
})
export class CategoriasCadastroComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaService);
  protected readonly context = injectContext<TuiDialogContext<string, Categoria>>();

  protected categoria: Categoria = this.context.data;
  readonly tipoOptions = [
    { value: CategoriaTipo.DESPESA, label: 'Despesa', appearance: 'negative', icon: 'banknote-arrow-down' },
    { value: CategoriaTipo.RECEITA, label: 'Receita', appearance: 'info', icon: 'banknote-arrow-up' },
    { value: CategoriaTipo.RESERVA, label: 'Reserva', appearance: 'positive', icon: 'piggy-bank' }
  ];

  protected readonly categoriaForm = this.fb.group({
    nome: [this.categoria?.nome || '', [Validators.required, Validators.minLength(2)]],
    tipo: [this.categoria?.tipo || CategoriaTipo.DESPESA, Validators.required],
    descricao: [this.categoria?.descricao || '']
  });

  constructor(private elementRef: ElementRef<HTMLElement>) {
    // Definir foco no primeiro campo do formulário ao abrir o diálogo
    setTimeout(() => {
      const firstInput = this.elementRef.nativeElement.querySelector('input');
      firstInput?.focus();
    }, 0);
  }

  ngOnChanges() {
    if (this.categoria) {
      this.categoriaForm.patchValue({
        nome: this.categoria.nome,
        tipo: this.categoria.tipo,
        descricao: this.categoria.descricao || ''
      });
    } else {
      this.categoriaForm.reset({
        tipo: CategoriaTipo.DESPESA
      });
    }
  }

  saveCategoria() {
    if (this.categoriaForm.valid) {
      const formData = this.categoriaForm.value;
      const categoriaData = {
        nome: formData.nome!,
        tipo: formData.tipo! as CategoriaTipo,
        descricao: formData.descricao || undefined
      };

      if (this.categoria) {
        // Editar categoria existente
        this.categoriaService.update(this.categoria.id, categoriaData).subscribe({
          next: () => {
            this.onClose();
            this.categoriaForm.reset();

          },
          error: (error) => {
            console.error('Erro ao atualizar categoria:', error);
          }
        });
      } else {
        // Criar nova categoria
        this.categoriaService.create(categoriaData).subscribe({
          next: () => {
            this.onClose();
            this.categoriaForm.reset();
          },
          error: (error) => {
            console.error('Erro ao criar categoria:', error);
          }
        });
      }
    }
  }

  onClose() {
    this.context.completeWith('');
  }
}
