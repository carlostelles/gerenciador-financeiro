import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiConfirmService, TuiTooltip } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';

import { CategoriaService } from '../../core/services/categoria.service';
import { Categoria, PromptService, ToastService, CategoriaBadgeComponent } from '../../shared';
import { CategoriasCadastroComponent } from './components/cadastro/cadastro';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiTooltip,
    TuiTable,
    TuiTableControl,
    CategoriaBadgeComponent
],
  providers: [TuiConfirmService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.scss']
})
export class CategoriasComponent implements OnInit {
  private readonly categoriaService = inject(CategoriaService);
  private readonly promptService = inject(PromptService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  categorias: Categoria[] = [];
  isLoading = signal<boolean>(false);
  showModal = false;

  editingCategoria: Categoria | null = null;

  ngOnInit() {
    this.loadCategorias();
  }

  loadCategorias() {
    this.isLoading.set(true);
    this.categoriaService.getAll().subscribe({
      next: (categorias) => {
        console.log(categorias);
        this.categorias = categorias;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
        this.isLoading.set(false);
      }
    });
  }

  openFormModal(categoria?: Categoria) {
    this.dialogs
      .open<string>(new PolymorpheusComponent(CategoriasCadastroComponent), {
        label: categoria ? 'Editar categoria' : 'Cadastrar categoria',
        size: 'm',
        data: categoria,
      })
      .subscribe({
        next: () => {
          this.toast.success('Categoria salva com sucesso!');
          this.loadCategorias();
        },
        error: (error) => {
          console.error('Erro ao salvar categoria:', error);
        }
      });
  }

  confirmDelete(categoria: Categoria) {
    this.promptService
      .open(`A categoria <strong>${categoria.nome}</strong> será excluída. Esta ação não pode ser desfeita.`, {
        heading: 'Confirmação de Exclusão',
        buttons: [
          { label: 'Excluir', appearance: 'accent', icon: 'trash' },
          { label: 'Cancelar', appearance: 'outline' }
        ]
      })
      .subscribe((result) => {
        if (result) {
          this.categoriaService.delete(categoria.id).subscribe({
            next: () => {
              this.toast.warning('Categoria excluída com sucesso!');
              this.loadCategorias();
            },
            error: (error) => {
              console.error('Erro ao excluir categoria:', error);
            }
          });
        }
      });
  }

  trackByFn(index: number, item: Categoria): string {
    return item.nome;
  }
}