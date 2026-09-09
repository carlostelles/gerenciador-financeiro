import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, catchError, map, of, defer, retry, timer, throwError, defaultIfEmpty } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean | Observable<boolean> {
    if (this.authService.isAuthenticated) {
      return true;
    }

    const refreshToken = this.authService.refreshToken;
    if (refreshToken) {
      return defer(() => {
        if (this.authService.isAuthenticated) return of(true);
        const token = this.authService.refreshToken;
        return token ? this.authService.refresh({ refreshToken: token }).pipe(map(() => true)) : of(false);
      }).pipe(
        // Mantém a navegação pendente durante indisponibilidade, sem exigir novo login.
        retry({ delay: error => error.status === 0 || error.status === 429 || error.status >= 500
          ? timer(30_000) : throwError(() => error) }),
        defaultIfEmpty(false),
        catchError(() => of(false))
      );
    }

    this.router.navigate(['/login']);
    return false;
  }
}
