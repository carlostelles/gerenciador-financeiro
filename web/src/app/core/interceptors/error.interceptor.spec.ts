import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TuiAlertService } from '@taiga-ui/core';
import { of } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { EspacoContextService } from '../services/espaco-context.service';
import { environment } from '../../../environments/environment';

describe('Renovação pelos interceptadores HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const router = { navigate: jest.fn() };
  const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 300, tokenType: 'Bearer' };
  const refreshUrl = `${environment.apiUrl}/auth/refresh`;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('auth_token', 'old-access');
    sessionStorage.setItem('refresh_token', 'valid-refresh');
    sessionStorage.setItem('token_expiration', String(Date.now() + 300_000));
    sessionStorage.setItem('espacoId', '42');
    router.navigate.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
      provideHttpClientTesting(), AuthService,
      { provide: Router, useValue: router },
      { provide: TuiAlertService, useValue: { open: jest.fn(() => of(null)) } },
      { provide: EspacoContextService, useValue: { selected: () => null } },
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { backend.verify(); sessionStorage.clear(); });

  it('compartilha um único refresh entre respostas 401 simultâneas', () => {
    const responses = jest.fn();
    http.get('/contas').subscribe(responses);
    http.get('/categorias').subscribe(responses);
    backend.expectOne('/contas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/categorias').flush({}, { status: 401, statusText: 'Unauthorized' });
    const requests = backend.match(refreshUrl);
    expect(requests).toHaveLength(1);
    requests[0].flush(tokens);
    for (const url of ['/contas', '/categorias']) {
      const retry = backend.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      expect(retry.request.headers.get('X-Espaco-Id')).toBe('42');
      retry.flush([]);
    }
    expect(responses).toHaveBeenCalledTimes(2);
  });

  it.each([403, 500])('não encerra a sessão se a requisição repetida falhar com %s', (status) => {
    const onError = jest.fn();
    http.get('/contas').subscribe({ error: onError });
    backend.expectOne('/contas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(refreshUrl).flush(tokens);
    backend.expectOne('/contas').flush({}, { status, statusText: 'Error' });
    expect(onError).toHaveBeenCalled();
    expect(sessionStorage.getItem('auth_token')).toBe('new-access');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([0, 429, 503])('preserva a sessão quando o refresh falha temporariamente com %s', (status) => {
    http.get('/contas').subscribe({ error: () => undefined });
    backend.expectOne('/contas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(refreshUrl).flush({}, { status, statusText: 'Error' });
    expect(sessionStorage.getItem('refresh_token')).toBe('valid-refresh');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('encerra localmente uma sessão rejeitada sem chamar logout protegido', () => {
    let authenticated = true;
    TestBed.inject(AuthService).isAuthenticated$.subscribe(value => authenticated = value);
    http.get('/contas').subscribe({ error: () => undefined });
    backend.expectOne('/contas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(refreshUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectNone(`${environment.apiUrl}/auth/logout`);
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(authenticated).toBe(false);
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('preserva o espaço selecionado quando o access token já expirou', () => {
    sessionStorage.setItem('token_expiration', String(Date.now() - 1));
    http.get('/contas').subscribe();
    backend.expectOne('/contas').flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(refreshUrl).flush(tokens);
    const retry = backend.expectOne('/contas');
    expect(retry.request.headers.get('X-Espaco-Id')).toBe('42');
    retry.flush([]);
  });
});
