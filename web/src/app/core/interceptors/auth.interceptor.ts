import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { EspacoContextService } from '../services/espaco-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const espacoContext = inject(EspacoContextService);

    // Evitar interceptar requisições de autenticação
    if (req.url.includes('/auth/')) {
        return next(req);
    }

    let headers = req.headers;
    const espacoId = espacoContext.selected()?.id ?? sessionStorage.getItem('espacoId');
    if (espacoId) headers = headers.set('X-Espaco-Id', String(espacoId));

    if (authService.token && authService.isAuthenticated) {
        headers = headers.set('Authorization', `Bearer ${authService.token}`);
    }

    return next(req.clone({ headers }));
};
