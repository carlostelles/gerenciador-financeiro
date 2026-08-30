import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDataList, TuiDialogService, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiComboBox, TuiConfirmService, TuiTooltip } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';

import { ContaService } from '../../core/services/conta.service';
import { Conta, PromptService, ToastService, ButtonFloatComponent } from '../../shared';
import { ContasCadastroComponent } from './components/cadastro/cadastro';
import { EspacoContextService } from '../../core/services/espaco-context.service';
import { EspacoService } from '../../core/services/espaco.service';
import { EspacoMembro, EspacoPapel } from '../../shared/interfaces';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiIcon,
    TuiTextfield,
    TuiTooltip,
    TuiBadge,
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
  protected readonly espacoContext = inject(EspacoContextService);
  private readonly espacoService = inject(EspacoService);

  contas: Conta[] = [];
  isLoading = signal<boolean>(false);
  showModal = false;
  protected readonly showMembers = signal(false);
  protected readonly members = signal<EspacoMembro[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly membersError = signal<string | null>(null);
  protected memberEmail = '';
  protected memberRole: EspacoPapel = 'VIEWER';
  protected readonly roleStringify = (papel: EspacoPapel): string =>
    papel === 'EDITOR' ? 'Editor' : 'Visualizador';

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

  protected toggleMembers(): void {
    this.showMembers.update((value) => !value);
    if (this.showMembers()) this.loadMembers();
  }

  protected loadMembers(): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId || !this.espacoContext.isOwner()) return;
    this.membersLoading.set(true);
    this.membersError.set(null);
    this.espacoService.members(espacoId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.membersLoading.set(false);
      },
      error: () => {
        this.membersError.set('Não foi possível carregar os membros.');
        this.membersLoading.set(false);
      },
    });
  }

  protected addMember(): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId || !this.memberEmail.trim()) return;
    this.membersError.set(null);
    this.espacoService
      .addMember(espacoId, this.memberEmail.trim(), this.memberRole)
      .subscribe({
        next: () => {
          this.memberEmail = '';
          this.loadMembers();
        },
        error: (error) => {
          this.membersError.set(
            error.status === 409
              ? 'Este usuário já participa do espaço.'
              : 'Não foi possível adicionar este usuário.',
          );
        },
      });
  }

  protected changeRole(member: EspacoMembro, papel: EspacoPapel): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId) return;
    this.espacoService.updateMember(espacoId, member.usuarioId, papel).subscribe({
      next: () => this.loadMembers(),
      error: () => this.membersError.set('Não foi possível alterar o papel.'),
    });
  }

  protected removeMember(member: EspacoMembro): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId) return;
    this.espacoService.removeMember(espacoId, member.usuarioId).subscribe({
      next: () => this.loadMembers(),
      error: () => this.membersError.set('Não foi possível remover o membro.'),
    });
  }

  protected transfer(member: EspacoMembro): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId) return;
    this.espacoService.transfer(espacoId, member.usuarioId).subscribe({
      next: () => this.espacoContext.load().subscribe(() => this.loadMembers()),
      error: () => this.membersError.set('Não foi possível transferir a propriedade.'),
    });
  }

  protected leaveSpace(): void {
    const espacoId = this.espacoContext.selected()?.id;
    if (!espacoId) return;
    this.espacoService.leave(espacoId).subscribe({
      next: () => {
        this.contas = [];
        this.members.set([]);
        this.showMembers.set(false);
        this.espacoContext.load().subscribe({
          next: () => this.loadContas(),
        });
      },
      error: () => this.membersError.set('Não foi possível sair do espaço.'),
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

  protected getTags(conta: Conta): string[] {
    return conta.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || [];
  }
}
