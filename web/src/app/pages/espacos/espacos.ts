import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDropdown, TuiHint, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiComboBox } from '@taiga-ui/kit';
import { finalize, Observable, Observer, Subscription } from 'rxjs';

import { EspacoContextService } from '../../core/services/espaco-context.service';
import { EspacoService } from '../../core/services/espaco.service';
import {
  Espaco,
  EspacoMembro,
  EspacoPapel,
  PromptService,
  ToastService,
} from '../../shared';

@Component({
  selector: 'app-espacos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiBadge,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiDropdown,
    TuiHint,
    TuiIcon,
    TuiTextfield,
  ],
  templateUrl: './espacos.html',
  styleUrls: ['./espacos.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EspacosComponent {
  protected readonly context = inject(EspacoContextService);
  private readonly service = inject(EspacoService);
  private readonly prompt = inject(PromptService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected newSpaceName = '';
  protected editingId: number | null = null;
  protected editingName = '';
  protected memberEmail = '';
  protected memberRole: EspacoPapel = 'VIEWER';
  protected readonly members = signal<EspacoMembro[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly mutationPending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly roleStringify = (papel: EspacoPapel): string =>
    papel === 'EDITOR' ? 'Editor' : 'Visualizador';
  private readonly selectedSpaceEffect = effect((onCleanup) => {
    const selected = this.context.selected();
    this.members.set([]);
    if (selected?.papel === 'OWNER') {
      const subscription = this.loadMembers(selected.id);
      onCleanup(() => subscription.unsubscribe());
    } else {
      this.membersLoading.set(false);
    }
  });

  protected createSpace(): void {
    const nome = this.newSpaceName.trim();
    if (!nome || this.mutationPending()) return;
    this.error.set(null);
    this.runMutation(this.service.create(nome), {
      next: () => {
        this.newSpaceName = '';
        this.context.load().subscribe();
        this.toast.success('Espaço criado com sucesso.');
      },
      error: (error) => this.handleSpaceError(error, 'Não foi possível criar o espaço.'),
    });
  }

  protected beginRename(space: Espaco): void {
    this.editingId = space.id;
    this.editingName = space.nome;
  }

  protected cancelRename(): void {
    this.editingId = null;
    this.editingName = '';
  }

  protected saveRename(space: Espaco): void {
    const nome = this.editingName.trim();
    if (!nome || this.mutationPending()) return;
    this.error.set(null);
    this.runMutation(this.service.rename(space.id, nome), {
      next: () => {
        this.cancelRename();
        this.context.load().subscribe();
        this.toast.success('Espaço renomeado.');
      },
      error: (error) => this.handleSpaceError(error, 'Não foi possível renomear o espaço.'),
    });
  }

  protected deleteSpace(space: Espaco): void {
    this.prompt
      .open(
        `<strong>${space.nome}</strong> só pode ser excluído sem contas, movimentações, categorias, orçamentos, reservas ou membros adicionais. A exclusão não pode ser desfeita.`,
        {
          heading: 'Excluir espaço financeiro',
          buttons: [
            { label: 'Excluir', appearance: 'accent', icon: 'trash' },
            { label: 'Cancelar', appearance: 'outline' },
          ],
        },
      )
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runMutation(this.service.remove(space.id), {
          next: () => {
            this.context.removeLocal(space.id);
            this.members.set([]);
            this.toast.warning('Espaço excluído.');
          },
          error: (error) => this.handleSpaceError(error, 'Não foi possível excluir o espaço.'),
        });
      });
  }

  protected leaveSpace(space: Espaco): void {
    this.prompt
      .open(`Você perderá o acesso a <strong>${space.nome}</strong>. Os dados do espaço serão mantidos.`, {
        heading: 'Sair do espaço',
        buttons: [
          { label: 'Sair', appearance: 'accent', icon: 'log-out' },
          { label: 'Cancelar', appearance: 'outline' },
        ],
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runMutation(this.service.leave(space.id), {
          next: () => {
            this.context.removeLocal(space.id);
            this.members.set([]);
            this.toast.warning('Você saiu do espaço.');
          },
          error: () => this.error.set('Não foi possível sair do espaço.'),
        });
      });
  }

  protected manage(space: Espaco): void {
    this.context.select(space.id);
    this.members.set([]);
    this.error.set(null);
  }

  protected addMember(): void {
    const space = this.context.selected();
    const email = this.memberEmail.trim();
    if (!space || !email || space.papel !== 'OWNER' || this.mutationPending()) return;
    this.runMutation(this.service.addMember(space.id, email, this.memberRole), {
      next: () => {
        this.memberEmail = '';
        this.loadMembers(space.id);
      },
      error: (error) =>
        this.error.set(
          error.status === 409
            ? 'Este usuário já participa do espaço.'
            : 'Não foi possível adicionar este usuário.',
        ),
    });
  }

  protected changeRole(member: EspacoMembro, papel: EspacoPapel): void {
    const space = this.context.selected();
    if (!space || this.mutationPending()) return;
    this.runMutation(this.service.updateMember(space.id, member.usuarioId, papel), {
      next: () => this.loadMembers(space.id),
      error: () => this.error.set('Não foi possível alterar o papel.'),
    });
  }

  protected removeMember(member: EspacoMembro): void {
    const space = this.context.selected();
    if (!space) return;
    this.prompt
      .open(`Remover <strong>${member.usuario?.nome ?? member.usuario?.email}</strong> deste espaço?`, {
        heading: 'Remover membro',
        buttons: [
          { label: 'Remover', appearance: 'accent', icon: 'user-minus' },
          { label: 'Cancelar', appearance: 'outline' },
        ],
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runMutation(this.service.removeMember(space.id, member.usuarioId), {
          next: () => this.loadMembers(space.id),
          error: () => this.error.set('Não foi possível remover o membro.'),
        });
      });
  }

  protected transfer(member: EspacoMembro): void {
    const space = this.context.selected();
    if (!space) return;
    this.prompt
      .open(
        `Transferir <strong>${space.nome}</strong> para <strong>${member.usuario?.nome ?? member.usuario?.email}</strong>? Seu papel passará a Editor.`,
        {
          heading: 'Transferir propriedade',
          buttons: [
            { label: 'Transferir', appearance: 'accent', icon: 'arrow-right-left' },
            { label: 'Cancelar', appearance: 'outline' },
          ],
        },
      )
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runMutation(this.service.transfer(space.id, member.usuarioId), {
          next: () => {
            this.members.set([]);
            this.context.load().subscribe();
            this.toast.success('Propriedade transferida.');
          },
          error: (error) => this.handleSpaceError(error, 'Não foi possível transferir a propriedade.'),
        });
      });
  }

  private loadMembers(espacoId: number): Subscription {
    this.membersLoading.set(true);
    return this.service
      .members(espacoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          this.members.set(members);
          this.membersLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os membros.');
          this.membersLoading.set(false);
        },
      });
  }

  private runMutation<T>(
    request: Observable<T>,
    observer: Partial<Observer<T>>,
  ): void {
    if (this.mutationPending()) return;
    this.mutationPending.set(true);
    request
      .pipe(finalize(() => this.mutationPending.set(false)))
      .subscribe(observer);
  }

  private handleSpaceError(error: { status?: number; error?: { message?: string } }, fallback: string): void {
    this.error.set(error.status === 409 ? (error.error?.message ?? fallback) : fallback);
  }
}
