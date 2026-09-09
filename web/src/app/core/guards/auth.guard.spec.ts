import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('AuthGuard: recuperação de sessão', () => {
  let guard: AuthGuard;
  let http: HttpTestingController;
  const router = { navigate: jest.fn() };

  beforeEach(() => {
    sessionStorage.clear();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService, AuthGuard,
        { provide: Router, useValue: router }],
    });
    guard = TestBed.inject(AuthGuard);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); sessionStorage.clear(); });

  function activate() {
    const result = guard.canActivate();
    return firstValueFrom(isObservable(result) ? result : of(result));
  }

  it('aguarda renovar o access token expirado antes de liberar a rota', async () => {
    sessionStorage.setItem('auth_token', 'expired');
    sessionStorage.setItem('token_expiration', String(Date.now() - 1));
    sessionStorage.setItem('refresh_token', 'valid-refresh');
    const result = activate();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 300, tokenType: 'Bearer',
    });
    expect(await result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('não libera a rota quando o refresh token é rejeitado', async () => {
    sessionStorage.setItem('refresh_token', 'invalid-refresh');
    const result = activate();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBe(false);
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('mantém a navegação pendente e a recupera após indisponibilidade temporária', fakeAsync(() => {
    sessionStorage.setItem('refresh_token', 'valid-refresh');
    let allowed: unknown;
    activate().then(result => allowed = result);
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(sessionStorage.getItem('refresh_token')).toBe('valid-refresh');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(allowed).toBeUndefined();
    tick(30_000);
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 300,
    });
    tick();
    expect(allowed).toBe(true);
  }));

  it('redireciona ao login quando não há credenciais', async () => {
    expect(await activate()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    http.expectNone(`${environment.apiUrl}/auth/refresh`);
  });
});
