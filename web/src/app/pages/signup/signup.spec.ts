import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SignupComponent } from './signup';
import { UsuarioService } from '../../core/services/usuario.service';
import { CreateUsuarioDto } from '../../shared/interfaces';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let mockUsuarioService: jest.Mocked<UsuarioService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    mockUsuarioService = {
      create: jest.fn()
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [SignupComponent, ReactiveFormsModule],
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.signupForm.get('nome')?.value).toBe('');
    expect(component.signupForm.get('email')?.value).toBe('');
    expect(component.signupForm.get('telefone')?.value).toBe('');
    expect(component.signupForm.get('senha')?.value).toBe('');
  });

  it('should validate required fields', () => {
    component.signupForm.patchValue({
      nome: '',
      email: '',
      telefone: '',
      senha: ''
    });

    expect(component.signupForm.invalid).toBeTruthy();
    expect(component.signupForm.get('nome')?.errors?.['required']).toBeTruthy();
    expect(component.signupForm.get('email')?.errors?.['required']).toBeTruthy();
    expect(component.signupForm.get('telefone')?.errors?.['required']).toBeTruthy();
    expect(component.signupForm.get('senha')?.errors?.['required']).toBeTruthy();
  });

  it('should validate email format', () => {
    component.signupForm.patchValue({
      email: 'invalid-email'
    });

    expect(component.signupForm.get('email')?.errors?.['email']).toBeTruthy();
  });

  it('should validate phone pattern', () => {
    component.signupForm.patchValue({
      telefone: '123'
    });

    expect(component.signupForm.get('telefone')?.errors?.['pattern']).toBeTruthy();
  });

  it('should validate password constraints', () => {
    // Test minimum length
    component.signupForm.patchValue({
      senha: '123'
    });
    expect(component.signupForm.get('senha')?.errors?.['minlength']).toBeTruthy();

    // Test maximum length
    component.signupForm.patchValue({
      senha: '12345678901234567'
    });
    expect(component.signupForm.get('senha')?.errors?.['maxlength']).toBeTruthy();

    // Test pattern (alphanumeric only)
    component.signupForm.patchValue({
      senha: 'password@123'
    });
    expect(component.signupForm.get('senha')?.errors?.['pattern']).toBeTruthy();
  });

  it('should call usuarioService.create and navigate on successful submission', () => {
    const mockUser = { id: 1, nome: 'Test User' } as any;
    mockUsuarioService.create.mockReturnValue(of(mockUser));

    component.signupForm.patchValue({
      nome: 'Test User',
      email: 'test@example.com',
      telefone: '5511999999999',
      senha: 'password123'
    });

    component.onSubmit();

    expect(mockUsuarioService.create).toHaveBeenCalledWith({
      nome: 'Test User',
      email: 'test@example.com',
      telefone: '5511999999999',
      senha: 'password123'
    } as CreateUsuarioDto);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle error on submission', () => {
    const errorResponse = { error: { message: 'Email already exists' } };
    mockUsuarioService.create.mockReturnValue(throwError(() => errorResponse));

    component.signupForm.patchValue({
      nome: 'Test User',
      email: 'test@example.com',
      telefone: '5511999999999',
      senha: 'password123'
    });

    component.onSubmit();

    expect(component.isLoading).toBeFalsy();
    expect(component.errorMessage).toBe('Email already exists');
  });

  it('should not submit if form is invalid', () => {
    component.signupForm.patchValue({
      nome: '',
      email: 'invalid-email',
      telefone: '123',
      senha: 'short'
    });

    component.onSubmit();

    expect(mockUsuarioService.create).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});