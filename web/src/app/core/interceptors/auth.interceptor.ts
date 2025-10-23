import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    // Evitar interceptar requisições de autenticação
    if (req.url.includes('/auth/')) {
        return next(req);
    }

    if (authService.token && authService.isAuthenticated) {
        const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${authService.token}`)
        });
        return next(authReq);
    }

    return next(req);
};