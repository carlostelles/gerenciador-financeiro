import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiConfirmService, TuiTooltip, TuiBadge } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';

import { UsuarioService } from '../../core/services/usuario.service';
import { Usuario, UserRole, ToastService, PromptService, ButtonFloatComponent, PhonePipe } from '../../shared';
import { UsuariosCadastroComponent } from './components/cadastro/cadastro';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiTooltip,
    TuiTable,
    TuiTableControl,
    TuiBadge,
    ButtonFloatComponent,
    PhonePipe
  ],
  providers: [TuiConfirmService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.scss']
})
export class UsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly promptService = inject(PromptService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  usuarios: Usuario[] = [];
  isLoading = signal<boolean>(false);
  showModal = false;

  editingUsuario: Usuario | null = null;

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.isLoading.set(true);
    this.usuarioService.getAll().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar usuários:', error);
        this.isLoading.set(false);
        this.toast.error('Erro ao carregar usuários');
      }
    });
  }

  openFormModal(usuario?: Usuario) {
    this.dialogs
      .open<string>(new PolymorpheusComponent(UsuariosCadastroComponent), {
        label: usuario ? 'Editar usuário' : 'Cadastrar usuário',
        size: 'm',
        data: usuario,
      })
      .subscribe({
        next: () => {
          this.toast.success('Usuário salvo com sucesso!');
          this.loadUsuarios();
        },
        error: (error) => {
          console.error('Erro ao salvar usuário:', error);
        }
      });
  }

  confirmDelete(usuario: Usuario) {
    this.promptService
      .open(`O usuário <strong>${usuario.nome}</strong> será desativado.`, {
        heading: 'Confirmação de Desativação',
        buttons: [
          { label: 'Desativar', appearance: 'accent', icon: 'user-minus' },
          { label: 'Cancelar', appearance: 'outline' }
        ]
      })
      .subscribe((result) => {
        if (result) {
          this.usuarioService.delete(usuario.id).subscribe({
            next: () => {
              this.toast.warning('Usuário desativado com sucesso!');
              this.loadUsuarios();
            },
            error: (error) => {
              console.error('Erro ao desativar usuário:', error);
              this.toast.error('Erro ao desativar usuário');
            }
          });
        }
      });
  }

  getRoleBadge(role: UserRole) {
    return {
      [UserRole.ADMIN]: { 
        appearance: 'accent' as const, 
        label: 'Admin',
        icon: '@tui.crown'
      },
      [UserRole.USER]: { 
        appearance: 'neutral' as const, 
        label: 'Usuário',
        icon: '@tui.user'
      }
    }[role];
  }

  getStatusBadge(ativo: boolean) {
    return {
      appearance: ativo ? 'positive' as const : 'negative' as const,
      label: ativo ? 'Ativo' : 'Inativo',
      icon: ativo ? '@tui.check' : '@tui.x'
    };
  }

  trackByFn(index: number, item: Usuario): number {
    return item.id;
  }
}