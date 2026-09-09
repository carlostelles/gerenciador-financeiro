import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/interfaces';
import { AuthGuard } from './auth.guard';
import { Observable, isObservable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private authGuard: AuthGuard
  ) {}

  canActivate(): boolean | Observable<boolean> {
    const authenticated = this.authGuard.canActivate();
    return isObservable(authenticated)
      ? authenticated.pipe(map(allowed => this.checkRole(allowed)))
      : this.checkRole(authenticated);
  }

  private checkRole(authenticated: boolean): boolean {
    if (!authenticated) return false;
    if (this.authService.decodedToken?.role === UserRole.ADMIN) {
      return true;
    }

    // Uma sessão válida não administrativa não pode acessar a rota.
    this.router.navigate(['/home']);
    return false;
  }
}
