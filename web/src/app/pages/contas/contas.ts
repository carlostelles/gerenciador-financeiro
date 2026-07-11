import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiConfirmService, TuiTooltip } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';

import { ContaService } from '../../core/services/conta.service';
import { Conta, PromptService, ToastService, ButtonFloatComponent } from '../../shared';
import { ContasCadastroComponent } from './components/cadastro/cadastro';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiTooltip,
    TuiTable,
    TuiTableControl,
    ButtonFloatComponent
],
  providers: [TuiConfirmService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contas.html',
  styleUrls: ['./contas.scss']
})
export class ContasComponent implements OnInit {
  private readonly contaService = inject(ContaService);
  private readonly promptService = inject(PromptService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  contas: Conta[] = [];
  isLoading = signal<boolean>(false);
  showModal = false;

  editingConta: Conta | null = null;

  ngOnInit() {
    this.loadContas();
  }

  loadContas() {
    this.isLoading.set(true);
    this.contaService.getAll().subscribe({
      next: (contas) => {
        this.contas = contas;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar contas:', error);
        this.isLoading.set(false);
      }
    });
  }

  openFormModal(conta?: Conta) {
    this.dialogs
      .open<string>(new PolymorpheusComponent(ContasCadastroComponent), {
        label: conta ? 'Editar conta' : 'Cadastrar conta',
        size: 'm',
        data: conta,
      })
      .subscribe({
        next: () => {
          this.toast.success('Conta salva com sucesso!');
          this.loadContas();
        },
        error: (error) => {
          console.error('Erro ao salvar conta:', error);
        }
      });
  }

  confirmDelete(conta: Conta) {
    this.promptService
      .open(`A conta <strong>${conta.nome}</strong> será excluída. Esta ação não pode ser desfeita.`, {
        heading: 'Confirmação de Exclusão',
        buttons: [
          { label: 'Excluir', appearance: 'accent', icon: 'trash' },
          { label: 'Cancelar', appearance: 'outline' }
        ]
      })
      .subscribe((result) => {
        if (result) {
          this.contaService.delete(conta.id).subscribe({
            next: () => {
              this.toast.warning('Conta excluída com sucesso!');
              this.loadContas();
            },
            error: (error) => {
              console.error('Erro ao excluir conta:', error);
            }
          });
        }
      });
  }

  trackByFn(index: number, item: Conta): string {
    return item.nome;
  }
}
