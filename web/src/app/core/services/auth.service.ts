import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, catchError, throwError, finalize, shareReplay, switchMap, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { AlterarSenhaDto, AuthResponse, JwtToken, LoginDto, RefreshTokenDto } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  private readonly tokenKey = 'auth_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly tokenExpirationKey = 'token_expiration';
  private refreshRequest$?: Observable<AuthResponse>;
  private sessionVersion = 0;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Método para decodificar o token JWT e extrair informações do usuário
  get decodedToken(): JwtToken | null   {
    if (this.token) {
      const payload = this.token.split('.')[1];
      return JSON.parse(atob(payload));
    }
    return null;
  }

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  get refreshToken(): string | null {
    return sessionStorage.getItem(this.refreshTokenKey);
  }

  private get hasValidToken(): boolean {
    const expiration = this.tokenExpiration;

    if (!this.token || !expiration) {
      return false;
    }

    // Verificar se o token não está expirado
    return new Date().getTime() < expiration;
  }

  get isAuthenticated(): boolean {
    return this.hasValidToken;
  }

  get tokenExpiration(): number | null {
    const expiration = sessionStorage.getItem(this.tokenExpirationKey);
    return expiration ? parseInt(expiration, 10) : null;
  }

  get isTokenExpiring(): boolean {
    const expiration = this.tokenExpiration;
    if (!expiration) {
      return true;
    }
    // Falta menos de 1 minuto para expirar
    return this.timeToExpiration < 1;
  }

  get timeToExpiration(): number {
    const expiration = this.tokenExpiration;
    if (!expiration) {
      return 0;
    }

    const now = new Date().getTime();
    return (expiration - now) / 1000 / 60;
  }

  login(credentials: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.sessionVersion++;
          this.refreshRequest$ = undefined;
          this.handleAuthSuccess(response);
        })
      );
  }

  refresh(refreshTokenDto: RefreshTokenDto): Observable<AuthResponse> {
    // Timer, guardas e respostas 401 compartilham a mesma renovação em andamento.
    if (!this.refreshRequest$) {
      const version = this.sessionVersion;
      const request$ = this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, refreshTokenDto)
        .pipe(
          // Uma resposta antiga não pode restaurar um logout nem sobrescrever outro login.
          switchMap(response => version === this.sessionVersion ? of(response) : EMPTY),
          tap(response => this.handleAuthSuccess(response)),
          catchError((error: HttpErrorResponse) => {
            if (version !== this.sessionVersion) {
              return EMPTY;
            }
            if (error.status === 401) {
              this.clearSession();
            }
            return throwError(() => error);
          }),
          finalize(() => {
            if (this.refreshRequest$ === request$) this.refreshRequest$ = undefined;
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      this.refreshRequest$ = request$;
    }
    return this.refreshRequest$;
  }

  alterarSenha(dados: AlterarSenhaDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/alterar-senha`, dados);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/logout`, {})
      .pipe(
        tap(() => this.clearSession()),
        catchError(error => {
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    sessionStorage.setItem(this.tokenKey, response.accessToken);
    sessionStorage.setItem(this.refreshTokenKey, response.refreshToken);

    // Calcular o tempo de expiração baseado no expiresIn (em segundos)
    const expirationTime = new Date().getTime() + (response.expiresIn * 1000);
    sessionStorage.setItem(this.tokenExpirationKey, expirationTime.toString());

    this.isAuthenticatedSubject.next(true);
  }

  clearSession(): void {
    this.sessionVersion++;
    this.refreshRequest$ = undefined;
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.tokenExpirationKey);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  refreshTokenIfNeeded(): Observable<AuthResponse | null> {
    if (this.isTokenExpiring && this.refreshToken) {
      return this.refresh({ refreshToken: this.refreshToken! });
    }
    return of(null);
  }
}
