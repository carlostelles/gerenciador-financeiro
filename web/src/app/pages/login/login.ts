import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiLabel, TuiTextfield } from '@taiga-ui/core';
import { AuthService } from '../../core/services/auth.service';
import { LoginDto } from '../../shared/interfaces';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TuiLabel,
    TuiTextfield,
    TuiButton
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;

      const credentials: LoginDto = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading = false;
        }
      });
    }
  }
}
