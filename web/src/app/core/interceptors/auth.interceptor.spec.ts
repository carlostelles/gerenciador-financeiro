import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EspacoContextService } from '../services/espaco-context.service';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('envia autenticação e o espaço selecionado nas APIs protegidas', () => {
    const auth = { token: 'access-token', isAuthenticated: true };
    const context = { selected: () => ({ id: 42 }) };
    let intercepted: HttpRequest<unknown> | undefined;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: EspacoContextService, useValue: context },
      ],
    });

    TestBed.runInInjectionContext(() =>
      authInterceptor(
        new HttpRequest('GET', '/movimentacoes/2026-08'),
        (request) => {
          intercepted = request;
          return of(new HttpResponse());
        },
      ).subscribe(),
    );

    expect(intercepted?.headers.get('Authorization')).toBe('Bearer access-token');
    expect(intercepted?.headers.get('X-Espaco-Id')).toBe('42');
  });

  it('não envia o espaço em endpoints de autenticação', () => {
    const auth = { token: 'access-token', isAuthenticated: true };
    const context = { selected: () => ({ id: 42 }) };
    let intercepted: HttpRequest<unknown> | undefined;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: EspacoContextService, useValue: context },
      ],
    });

    TestBed.runInInjectionContext(() =>
      authInterceptor(new HttpRequest('POST', '/auth/login'), (request) => {
        intercepted = request;
        return of(new HttpResponse());
      }).subscribe(),
    );

    expect(intercepted?.headers.has('Authorization')).toBe(false);
    expect(intercepted?.headers.has('X-Espaco-Id')).toBe(false);
  });
});
