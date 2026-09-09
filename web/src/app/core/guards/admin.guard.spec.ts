import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AdminGuard } from './admin.guard';
import { environment } from '../../../environments/environment';
import { UserRole } from '../../shared/interfaces';

describe('AdminGuard: sessão expirada em navegação entre filhos', () => {
  const router = { navigate: jest.fn() };
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('refresh_token', 'valid-refresh');
    router.navigate.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), AdminGuard,
      { provide: Router, useValue: router },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });

  it.each([UserRole.ADMIN, UserRole.USER])('renova antes de verificar a permissão %s', async (role) => {
    const result = TestBed.inject(AdminGuard).canActivate();
    const allowed = firstValueFrom(isObservable(result) ? result : of(result));
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: `header.${btoa(JSON.stringify({ role }))}.signature`,
      refreshToken: 'new-refresh', expiresIn: 300,
    });
    expect(await allowed).toBe(role === UserRole.ADMIN);
    if (role === UserRole.ADMIN) {
      expect(router.navigate).not.toHaveBeenCalled();
    } else {
      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    }
  });
});
