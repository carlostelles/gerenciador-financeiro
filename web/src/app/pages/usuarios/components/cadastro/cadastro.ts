import { ChangeDetectionStrategy, Component, ElementRef, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiFlagPipe, TuiTextfield, TuiIcon } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiChip, TuiInputPhone } from '@taiga-ui/kit';

import { UsuarioService } from '../../../../core/services/usuario.service';
import { Usuario, UserRole, CreateUsuarioDto, UpdateUsuarioDto } from '../../../../shared/interfaces';
import { TuiForm } from '@taiga-ui/layout';

@Component({
    selector: 'app-usuarios-cadastro',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        TuiChip,
        TuiInputPhone,
        TuiFlagPipe,
        TuiIcon,
        TuiForm
    ],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './cadastro.html',
    styleUrl: './cadastro.scss'
})
export class UsuariosCadastroComponent {
    private readonly fb = inject(FormBuilder);
    private readonly usuarioService = inject(UsuarioService);
    protected readonly context = injectContext<TuiDialogContext<string, Usuario>>();

    protected usuario: Usuario = {
        ...this.context.data,
        telefone: this.context.data?.telefone ? '+' + this.context.data.telefone : ''
    };
    readonly roleOptions = [
        { value: UserRole.USER, label: 'Usuário', appearance: 'neutral', icon: 'user' },
        { value: UserRole.ADMIN, label: 'Administrador', appearance: 'accent', icon: 'crown' }
    ];

    protected readonly usuarioForm = this.fb.group({
        nome: [this.usuario?.nome || '', [Validators.required, Validators.minLength(2)]],
        email: [this.usuario?.email || '', [Validators.required, Validators.email]],
        telefone: [this.usuario?.telefone || '', [Validators.required, Validators.pattern(/^\+\d{13}$/)]],
        senha: ['', this.usuario ? [] : [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
        role: [this.usuario?.role || UserRole.USER, Validators.required],
        ativo: [this.usuario?.ativo ?? true]
    });

    constructor(private elementRef: ElementRef<HTMLElement>) {
        // Definir foco no primeiro campo do formulário ao abrir o diálogo
        setTimeout(() => {
            const firstInput = this.elementRef.nativeElement.querySelector('input');
            firstInput?.focus();
        }, 0);

        // Se é edição, senha não é obrigatória
        if (this.usuario) {
            this.usuarioForm.get('senha')?.clearValidators();
            this.usuarioForm.get('senha')?.updateValueAndValidity();
        }
    }


    saveUsuario() {
        if (this.usuarioForm.valid) {
            const formData = this.usuarioForm.value;

            if (this.usuario) {
                // Editar usuário existente
                const updateData: UpdateUsuarioDto = {
                    nome: formData.nome!,
                    email: formData.email!,
                    telefone: formData.telefone!.replace(/\D/g, ''),
                    role: formData.role! as UserRole,
                    ativo: formData.ativo!
                };

                // Só inclui senha se foi preenchida
                if (formData.senha?.trim()) {
                    updateData.senha = formData.senha;
                }

                this.usuarioService.update(this.usuario.id, updateData).subscribe({
                    next: () => {
                        this.onClose();
                        this.usuarioForm.reset();
                    },
                    error: (error) => {
                        console.error('Erro ao atualizar usuário:', error);
                    }
                });
            } else {
                // Criar novo usuário
                const createData: CreateUsuarioDto = {
                    nome: formData.nome!,
                    email: formData.email!,
                    telefone: formData.telefone!.replace(/\D/g, ''),
                    senha: formData.senha!,
                    role: formData.role! as UserRole
                };

                this.usuarioService.create(createData).subscribe({
                    next: () => {
                        this.onClose();
                        this.usuarioForm.reset();
                    },
                    error: (error) => {
                        console.error('Erro ao criar usuário:', error);
                    }
                });
            }
        }
    }

    formatTelefoneInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/\D/g, ''); // Remove caracteres não numéricos

        // Limita a 13 dígitos
        if (value.length <= 13) {
            this.usuarioForm.get('telefone')?.setValue(value);
        }
    }

    // Verifica se há erros específicos para exibir
    hasFieldError(fieldName: string, errorType: string): boolean {
        const field = this.usuarioForm.get(fieldName);
        return !!(field?.errors?.[errorType] && field?.touched);
    }

    // formatTelefoneInput removido pois não está sendo utilizado

    onClose() {
        this.context.completeWith('');
    }
}