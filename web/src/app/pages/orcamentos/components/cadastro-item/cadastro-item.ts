import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiIcon, TuiNumberFormat } from '@taiga-ui/core';
import { TuiTextfield } from '@taiga-ui/core/components/textfield';
import { TuiComboBox } from '@taiga-ui/kit/components/combo-box';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDataListWrapper } from '@taiga-ui/kit/components/data-list-wrapper';
import { TuiChevron } from '@taiga-ui/kit/directives/chevron';
import { TuiCurrencyPipe } from '@taiga-ui/addon-commerce';
import { CommonModule } from '@angular/common';
import { TuiInputNumber, TuiTooltip } from '@taiga-ui/kit';
import { TuiStringHandler } from '@taiga-ui/cdk/types';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';
import { TuiForm } from '@taiga-ui/layout';

import { OrcamentoService } from '../../../../core/services/orcamento.service';
import { CategoriaService } from '../../../../core/services/categoria.service';
import { Orcamento, UpdateOrcamentoDto, Categoria, CreateOrcamentoItemDto, OrcamentoItem, formatPeriod, CurrencyPipe, PromptService, UpdateOrcamentoItemDto, ToastService, CategoriaBadgeComponent, CategoriaTipo } from '../../../../shared';

@Component({
  selector: 'app-cadastro-orcamento-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiTextfield,
    TuiDataList,
    TuiButton,
    TuiCurrencyPipe,
    TuiInputNumber,
    TuiNumberFormat,
    TuiIcon,
    TuiTable,
    TuiTableControl,
    TuiTooltip,
    CurrencyPipe,
    CategoriaBadgeComponent,
    TuiForm
  ],
  templateUrl: './cadastro-item.html',
  styleUrls: ['./cadastro-item.scss']
})
export class OrcamentosItemCadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly orcamentoService = inject(OrcamentoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly context = inject<TuiDialogContext<string, Orcamento | undefined>>(POLYMORPHEUS_CONTEXT);
  private readonly promptService = inject(PromptService);
  private readonly toast = inject(ToastService);

  protected readonly CategoriaTipo = CategoriaTipo;
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly orcamento = signal<Orcamento>(this.context.data!);
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly stringify: TuiStringHandler<number> = (id) =>
    this.categorias().find((item) => item.id === id)?.nome ?? '';

  orcamentoItemForm!: FormGroup;

  trackByFn = (index: number, item: any) => item.id || index;

  ngOnInit() {
    this.loadCategorias();
    this.initializeForm();
    console.log(this.context.data, this.orcamento());
  }

  getCategoria = (id: number): Categoria | undefined => {
    return this.categorias().find(cat => cat.id === id);
  }

  private initializeForm() {
    this.orcamentoItemForm = this.fb.group({
      id: [],
      categoriaId: ['', [Validators.required]],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      descricao: ['', [Validators.maxLength(255)]]
    });
  }

  loadFormItem(item: OrcamentoItem) {
    this.orcamentoItemForm.patchValue({
      id: item.id,
      categoriaId: item.categoriaId,
      descricao: item.descricao,
      valor: item.valor
    });
  }

  onSubmit() {
    if (this.orcamentoItemForm.valid) {
      this.isSubmitting.set(true);
      const itemData = this.orcamentoItemForm.value;
      if (!!this.orcamentoItemForm.value.id) {
        this.updateOrcamento(this.orcamentoItemForm.value.id, itemData);
      } else {
        this.createItem(itemData);
      }
    }
  }

  private createItem(itemData: CreateOrcamentoItemDto) {
    this.orcamentoService.createItem(this.orcamento().id, {
      ...itemData,
      id: undefined
    } as CreateOrcamentoItemDto).subscribe({
      next: () => {
        this.onReset();
        this.toast.success('Orçamento atualizado com sucesso!');
        this.loadOrcamentoItems();
      },
      error: (error) => {
        console.error('Erro ao criar orçamento:', error);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  private updateOrcamento(id: number, orcamentoData: UpdateOrcamentoDto) {
    this.orcamentoService.updateItem(this.orcamento().id, id, {
      ...orcamentoData,
      id: undefined
    } as UpdateOrcamentoItemDto).subscribe({
      next: () => {
        this.onReset();
        this.toast.success('Orçamento atualizado com sucesso!');
        this.loadOrcamentoItems();
      },
      error: (error) => {
        console.error('Erro ao atualizar orçamento:', error);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  private loadCategorias() {
    this.categoriaService.getAll().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    });
  }

  private loadOrcamentoItems() {
    this.orcamentoService.getItems(this.orcamento().id).subscribe({
      next: (items) => {
        this.orcamento.set({
          ...this.orcamento(),
          items
        });
      },
      error: (error) => {
        console.error('Erro ao carregar itens do orçamento:', error);
      }
    });
  }

  onReset() {
    this.orcamentoItemForm.reset();
  }

  confirmDelete(item: OrcamentoItem) {
    this.isSubmitting.set(true);
    this.promptService
      .open(`O item <strong>${item.descricao || this.getCategoria(item.categoriaId)}</strong> do orçamento <strong>${formatPeriod(this.orcamento().periodo)}</strong> será excluído. Esta ação não pode ser desfeita.`, {
        heading: 'Confirmação de Exclusão',
        buttons: [
          { label: 'Excluir', appearance: 'accent', icon: 'trash' },
          { label: 'Cancelar', appearance: 'outline' }
        ]
      })
      .subscribe({
        next: (result) => {
          if (result) {
            this.orcamentoService.deleteItem(this.orcamento().id, item.id).subscribe({
              next: () => {
                this.toast.warning('Registro excluído com sucesso!');
                this.loadOrcamentoItems();
                if (this.orcamentoItemForm.value.id === item.id) {
                  this.onReset();
                }
              },
              error: (error) => {
                console.error('Erro ao excluir item do orçamento:', error);
              },
              complete: () => {
                this.isSubmitting.set(false);
              }
            });
          }
        },
        error: (error) => {
          console.error('Erro ao confirmar exclusão:', error);
          this.isSubmitting.set(false);
        }
      });
  }

  getTotalDespesas(orcamento: Orcamento): number {
    return orcamento.items
      ?.filter(item => item.categoria.tipo === 'DESPESA')
      .reduce((total, item) => Number(total) + Number(item.valor), 0) || 0;
  }

  getTotalReceitas(orcamento: Orcamento): number {
    return orcamento.items
      ?.filter(item => item.categoria.tipo === 'RECEITA')
      .reduce((total, item) => Number(total) + Number(item.valor), 0) || 0;
  }
}
