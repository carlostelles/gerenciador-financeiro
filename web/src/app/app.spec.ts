import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { environment } from '../environments/environment';

describe('App: renovação automática', () => {
  let app: App;
  let state: BehaviorSubject<boolean>;
  let auth: {
    isAuthenticated$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
    isAuthenticated: boolean;
    refreshToken: string | null;
    timeToExpiration: number;
    refresh: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    state = new BehaviorSubject(false);
    auth = {
      isAuthenticated$: state.asObservable(),
      isAuthenticated: false,
      refreshToken: null,
      timeToExpiration: 5,
      refresh: jest.fn(() => of({})),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
    app = TestBed.runInInjectionContext(() => new App());
  });

  afterEach(() => {
    app.ngOnDestroy();
    jest.useRealTimers();
  });

  it('agenda a renovação após login sem recarregar a aplicação', () => {
    app.ngOnInit();
    auth.isAuthenticated = true;
    auth.refreshToken = 'refresh';
    state.next(true);
    jest.advanceTimersByTime(270_000);
    expect(auth.refresh).toHaveBeenCalledWith({ refreshToken: 'refresh' });
  });

  it('renova mesmo quando a aba retoma após a expiração do access token', () => {
    auth.isAuthenticated = true;
    auth.refreshToken = 'refresh';
    state.next(true);
    app.ngOnInit();
    auth.isAuthenticated = false;
    auth.timeToExpiration = -1;
    jest.advanceTimersByTime(270_000);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('recupera uma sessão expirada na inicialização usando o refresh token', () => {
    auth.refreshToken = 'refresh';
    auth.timeToExpiration = -1;
    app.ngOnInit();
    jest.advanceTimersByTime(0);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('cancela a renovação ao sair e ao destruir a aplicação', () => {
    auth.isAuthenticated = true;
    auth.refreshToken = 'refresh';
    state.next(true);
    app.ngOnInit();
    auth.isAuthenticated = false;
    auth.refreshToken = null;
    state.next(false);
    jest.advanceTimersByTime(300_000);
    expect(auth.refresh).not.toHaveBeenCalled();
    app.ngOnDestroy();
    auth.refreshToken = 'refresh';
    state.next(true);
    jest.advanceTimersByTime(300_000);
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});

describe('App integrado ao AuthService', () => {
  let app: App;
  let auth: AuthService;
  let http: HttpTestingController;
  const tokens = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 300, tokenType: 'Bearer' };

  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: { navigate: jest.fn() } }],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    app = TestBed.runInInjectionContext(() => new App());
    app.ngOnInit();
    auth.login({ email: 'test@example.com', senha: 'password' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(tokens);
  });

  afterEach(() => {
    app.ngOnDestroy();
    http.verify();
    sessionStorage.clear();
    jest.useRealTimers();
  });

  it('renova repetidamente e usa o refresh token mais recente', () => {
    jest.advanceTimersByTime(270_000);
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({ ...tokens, refreshToken: 'rotated' });
    jest.advanceTimersByTime(270_000);
    const second = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(second.request.body).toEqual({ refreshToken: 'rotated' });
    second.flush(tokens);
    expect(auth.isAuthenticated).toBe(true);
  });

  it('tenta novamente após falha de rede mesmo que o access token expire', () => {
    jest.advanceTimersByTime(270_000);
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({}, { status: 503, statusText: 'Unavailable' });
    jest.advanceTimersByTime(30_000);
    expect(auth.isAuthenticated).toBe(false);
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(tokens);
    expect(auth.isAuthenticated).toBe(true);
  });

  it('compartilha a renovação pendente do timer com a guarda', () => {
    jest.advanceTimersByTime(270_000);
    const pending = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    jest.advanceTimersByTime(31_000);
    const result = TestBed.inject(AuthGuard).canActivate();
    const allowed = jest.fn();
    if (typeof result !== 'boolean') result.subscribe(allowed);
    http.expectNone(`${environment.apiUrl}/auth/refresh`);
    pending.flush(tokens);
    expect(allowed).toHaveBeenCalledWith(true);
  });
});
