import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated && this.authService.decodedToken?.role === UserRole.ADMIN) {
      return true;
    }
    
    // Redireciona para home se não for admin ou não estiver autenticado
    this.router.navigate(['/home']);
    return false;
  }
}