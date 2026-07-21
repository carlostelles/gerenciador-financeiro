import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';

import { AuthService } from '../../core/services/auth.service';
import { AlterarSenhaDto } from '../../shared/interfaces';
import { ToastService } from '../../shared';

const SAFE_PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|?,.:]+$/;

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TuiButton, TuiLabel, TuiTextfield],
  templateUrl: './esqueci-senha.html',
  styleUrls: ['./esqueci-senha.scss'],
})
export class EsqueciSenhaComponent {
  private readonly passwordValidators = [
    Validators.minLength(8),
    Validators.maxLength(16),
    Validators.pattern(SAFE_PASSWORD_PATTERN),
  ];

  protected readonly form = this.formBuilder.group(
    {
      email: ['', [Validators.required, Validators.email]],
      senhaAtual: ['', [Validators.required, ...this.passwordValidators]],
      novaSenha: ['', [Validators.required, ...this.passwordValidators]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: this.passwordsMatch },
  );
  protected isLoading = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.alterarSenha(this.form.getRawValue() as AlterarSenhaDto).subscribe({
      next: ({ message }) => {
        this.toastService.success(message || 'Senha alterada com sucesso. Agora você já pode entrar.');
        this.isLoading = false;
        this.form.reset();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Não foi possível alterar a senha. Tente novamente.');
        this.isLoading = false;
      },
    });
  }

  protected hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return Boolean(control?.touched && control.hasError(errorName));
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const { novaSenha, confirmarSenha } = control.value;
    return novaSenha && confirmarSenha && novaSenha !== confirmarSenha
      ? { passwordMismatch: true }
      : null;
  }
}
