import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiLabel, TuiTextfield, TuiNotification, TuiLoader } from '@taiga-ui/core';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TuiButton, TuiLabel, TuiTextfield, TuiNotification, TuiLoader],
  templateUrl: './esqueci-senha.html',
  styleUrls: ['./esqueci-senha.scss'],
})
export class EsqueciSenhaComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private timer?: ReturnType<typeof setInterval>;
  private availableAt = 0;
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });
  protected isLoading = false;
  protected remaining = 0;
  protected message = '';
  protected failed = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
  ) {}

  protected onSubmit(): void {
    if (this.isLoading || Date.now() < this.availableAt) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.element.nativeElement.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    this.isLoading = true;
    this.failed = false;
    this.message = '';
    this.authService.solicitarRecuperacao(this.form.getRawValue().email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.message = 'Se houver uma conta ativa com este e-mail, enviaremos um link para redefinir sua senha. Verifique também o spam.';
        this.isLoading = false;
        this.cooldown(60);
        this.focusFeedback();
      },
      error: (error) => {
        this.isLoading = false;
        this.failed = true;
        this.message = error.status === 429 ? 'Muitas tentativas. Aguarde para solicitar novamente.' : 'Não foi possível solicitar agora. Tente novamente mais tarde.';
        if (error.status === 429) this.cooldown(Number(error.headers?.get('Retry-After')) || 60);
        this.focusFeedback();
      },
    });
  }

  private cooldown(seconds: number): void {
    if (this.timer) clearInterval(this.timer);
    this.availableAt = Date.now() + Math.max(1, Math.min(seconds, 3600)) * 1000;
    const tick = () => {
      this.remaining = Math.max(0, Math.ceil((this.availableAt - Date.now()) / 1000));
      if (!this.remaining && this.timer) clearInterval(this.timer);
    };
    tick(); this.timer = setInterval(tick, 1000);
  }

  private focusFeedback(): void {
    setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>('[role="status"]')?.focus());
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
