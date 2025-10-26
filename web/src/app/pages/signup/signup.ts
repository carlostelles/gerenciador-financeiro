import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiFlagPipe, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { UsuarioService } from '../../core/services/usuario.service';
import { CreateUsuarioDto } from '../../shared/interfaces';
import { TuiInputPhone } from '@taiga-ui/kit';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TuiLabel,
    TuiTextfield,
    TuiInputPhone,
    TuiFlagPipe,
    TuiButton
  ],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', [Validators.required, Validators.pattern(/^\+\d{13}$/)]],
      senha: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(16)
      ]]
    });
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;

      const formValue = this.signupForm.value;
      const userData: CreateUsuarioDto = {
        nome: formValue.nome,
        email: formValue.email,
        telefone: formValue.telefone.replace(/\D/g, ''), // Remove caracteres não numéricos
        senha: formValue.senha
      };

      this.usuarioService.create(userData).subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.isLoading = false;
        }
      });
    }
  }
}
