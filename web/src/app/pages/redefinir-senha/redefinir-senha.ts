import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiLabel, TuiTextfield, TuiNotification, TuiLoader } from '@taiga-ui/core';
import { AuthService } from '../../core/services/auth.service';

const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|?,.:]{8,16}$/;

@Component({
  selector: 'app-redefinir-senha', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TuiButton, TuiLabel, TuiTextfield, TuiNotification, TuiLoader],
  templateUrl: './redefinir-senha.html',
  styleUrls: ['../esqueci-senha/esqueci-senha.scss'],
})
export class RedefinirSenhaComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly auth = inject(AuthService);
  private token = '';
  protected invalidLink = false;
  protected succeeded = false;
  protected isLoading = false;
  protected message = '';
  protected readonly form = inject(FormBuilder).nonNullable.group({
    novaSenha: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirmarSenha: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  }, { validators: control => control.value.novaSenha === control.value.confirmarSenha ? null : { passwordMismatch: true } });

  constructor() {
    const window = this.document.defaultView;
    if (window) {
      const fragment = window.location.hash;
      // Remove before parsing/validation, even if malformed. No storage or API on open.
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      const params = new URLSearchParams(fragment.slice(1));
      const token = params.get('token') || '';
      if (params.getAll('token').length === 1 && /^[A-Za-z0-9_-]{43}$/.test(token)) this.token = token;
    }
    this.invalidLink = !this.token;
  }

  protected onSubmit(): void {
    if (this.isLoading || this.invalidLink || this.succeeded) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.element.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid, input')?.focus();
      return;
    }
    this.isLoading = true; this.message = '';
    this.auth.redefinirSenha({ token: this.token, ...this.form.getRawValue() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isLoading = false; this.succeeded = true; this.token = ''; this.form.reset();
        this.message = 'Senha redefinida com sucesso. Entre com sua nova senha.';
        this.focusFeedback();
      },
      error: error => {
        this.isLoading = false;
        if (error.status === 400) { this.invalidLink = true; this.token = ''; this.form.reset(); }
        this.message = error.status === 400 ? 'Link inválido ou expirado.' : error.status === 429 ? 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.' : 'Não foi possível confirmar. Tente entrar com a nova senha; se necessário, solicite outro link.';
        this.focusFeedback();
      },
    });
  }

  private focusFeedback(): void {
    setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>('[role="status"]')?.focus());
  }

  ngOnDestroy(): void { this.token = ''; this.form.reset(); }
}
