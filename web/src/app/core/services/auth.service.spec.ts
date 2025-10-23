import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, LoginDto } from '../../shared/interfaces';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(() => {
    mockRouter = {
      navigate: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', () => {
    const mockCredentials: LoginDto = {
      email: 'test@example.com',
      senha: 'password123'
    };

    const mockResponse: AuthResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600
    };

    service.login(mockCredentials).subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(sessionStorage.getItem('auth_token')).toBe('mock-access-token');
      expect(sessionStorage.getItem('refresh_token')).toBe('mock-refresh-token');
    });

    const req = httpMock.expectOne('http://localhost:3000/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCredentials);
    req.flush(mockResponse);
  });

  it('should refresh token successfully', () => {
    const mockRefreshDto = { refreshToken: 'mock-refresh-token' };
    const mockResponse: AuthResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600
    };

    service.refresh(mockRefreshDto).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:3000/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRefreshDto);
    req.flush(mockResponse);
  });

  it('should logout successfully', () => {
    // Set up tokens first
    sessionStorage.setItem('auth_token', 'mock-token');
    sessionStorage.setItem('refresh_token', 'mock-refresh');

    service.logout().subscribe(response => {
      expect(response).toEqual({ message: 'Logout realizado com sucesso' });
      expect(sessionStorage.getItem('auth_token')).toBeNull();
      expect(sessionStorage.getItem('refresh_token')).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    const req = httpMock.expectOne('http://localhost:3000/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Logout realizado com sucesso' });
  });

  it('should return token from sessionStorage', () => {
    sessionStorage.setItem('auth_token', 'test-token');
    expect(service.token).toBe('test-token');
  });

  it('should return null when no token exists', () => {
    expect(service.token).toBeNull();
  });

  it('should return refresh token from sessionStorage', () => {
    sessionStorage.setItem('refresh_token', 'test-refresh-token');
    expect(service.refreshToken).toBe('test-refresh-token');
  });

  it('should check if user is authenticated', () => {
    // No token
    expect(service.isAuthenticated).toBeFalsy();

    // With token
    sessionStorage.setItem('auth_token', 'test-token');
    expect(service.isAuthenticated).toBeTruthy();
  });

  it('should emit authentication state changes', () => {
    let authState: boolean | undefined;
    
    service.isAuthenticated$.subscribe(state => {
      authState = state;
    });

    // Initially false
    expect(authState).toBeFalsy();

    // Simulate login
    const mockResponse: AuthResponse = {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      tokenType: 'Bearer',
      expiresIn: 3600
    };

    service.login({ email: 'test@test.com', senha: 'password' }).subscribe();
    
    const req = httpMock.expectOne('http://localhost:3000/auth/login');
    req.flush(mockResponse);

    expect(authState).toBeTruthy();
  });
});