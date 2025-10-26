import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { catchError, throwError, switchMap, Observable, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../../shared/interfaces/auth.interface';
import { TuiAlertService } from '@taiga-ui/core';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const alerts = inject(TuiAlertService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<any>> => {
      // Se for erro 401 e não for uma tentativa de refresh token
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
        return handle401Error(req, next, authService, router);
      }
      
      // Se for erro 401 na rota de refresh token, fazer logout
      if (error.status === 401 && req.url.includes('/auth/refresh')) {
        authService.logout().subscribe();
        return throwError(() => error);
      }

      if (error.status === 403) {
        alerts.open('Acesso negado. Você não tem permissão para acessar este recurso.', { appearance: 'negative' }).subscribe();
      }

      if (error.status === 0) {
        alerts.open('Erro de rede. Verifique sua conexão com a internet.', { appearance: 'negative' }).subscribe();
      }

      if (error.status >= 500) {
        alerts.open('Erro no servidor. Tente novamente mais tarde.', { appearance: 'negative' }).subscribe();
      }

      if (error.status === 400) {
        error.error.message.forEach((msg: string) => {
          alerts.open(msg, { appearance: 'negative' }).subscribe();
        });
      }
      
      if (error.status > 404 && error.status < 500 || error.status === 401) {
        alerts.open(error.error.message, { appearance: 'negative' }).subscribe();
      }
      
      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<any>, 
  next: HttpHandlerFn, 
  authService: AuthService, 
  router: Router
): Observable<HttpEvent<any>> {
  const refreshToken = authService.refreshToken;

  if (refreshToken) {
    return authService.refresh({ refreshToken }).pipe(
      switchMap((response: AuthResponse) => {
        // Reenviar a requisição original com o novo token
        const newRequest = addTokenToRequest(request, response.accessToken);
        return next(newRequest);
      }),
      catchError((err) => {
        // Se falhar o refresh, fazer logout
        sessionStorage.clear();
        router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  } else {
    // Não há refresh token, fazer logout
    sessionStorage.clear();
    router.navigate(['/login']);
    return throwError(() => new Error('No refresh token available'));
  }
}

function addTokenToRequest(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
  if (token) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return request;
}