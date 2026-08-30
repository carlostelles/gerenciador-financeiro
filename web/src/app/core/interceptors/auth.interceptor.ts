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

    if (authService.token && authService.isAuthenticated) {
        let headers = req.headers.set('Authorization', `Bearer ${authService.token}`);
        const espacoId = espacoContext.selected()?.id;
        if (espacoId) headers = headers.set('X-Espaco-Id', String(espacoId));
        const authReq = req.clone({ headers });
        return next(authReq);
    }

    return next(req);
};