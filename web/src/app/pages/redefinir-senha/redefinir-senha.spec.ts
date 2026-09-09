import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { RedefinirSenhaComponent } from './redefinir-senha';
import { AuthService } from '../../core/services/auth.service';

describe('Redefinir senha', () => {
  const token = 'a'.repeat(43);
  const auth = { redefinirSenha: jest.fn() };
  beforeEach(async () => {
    auth.redefinirSenha.mockReset(); sessionStorage.clear(); localStorage.clear();
    history.replaceState({}, '', `/redefinir-senha#token=${token}`);
    await TestBed.configureTestingModule({ imports: [RedefinirSenhaComponent], providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }] }).compileComponents();
  });
  afterEach(() => history.replaceState({}, '', '/'));
  it('remove fragmento imediatamente, guarda só em memória e não faz validação remota na abertura', () => {
    const fixture = TestBed.createComponent(RedefinirSenhaComponent); fixture.detectChanges();
    expect(location.hash).toBe(''); expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('input[type=password]')).toHaveLength(2);
    fixture.destroy();
  });
  it('reload sem fragmento mostra ação para solicitar novo link', () => {
    history.replaceState({}, '', '/redefinir-senha');
    const fixture = TestBed.createComponent(RedefinirSenhaComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Solicitar novo link');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    fixture.destroy();
  });
  it('senha divergente não envia; sucesso orienta login manual', () => {
    auth.redefinirSenha.mockReturnValue(of({ message: 'OK' }));
    const fixture = TestBed.createComponent(RedefinirSenhaComponent); const component = fixture.componentInstance;
    component['form'].setValue({ novaSenha: 'abcdefgh', confirmarSenha: '12345678' }); component['onSubmit']();
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
    component['form'].setValue({ novaSenha: 'abcdefgh', confirmarSenha: 'abcdefgh' }); component['onSubmit'](); fixture.detectChanges();
    expect(auth.redefinirSenha).toHaveBeenCalledWith({ token, novaSenha: 'abcdefgh', confirmarSenha: 'abcdefgh' });
    expect(fixture.nativeElement.textContent).toContain('Entrar');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    fixture.destroy();
  });
  it('link expirado não repete POST e oferece nova solicitação', () => {
    auth.redefinirSenha.mockReturnValue(throwError(() => ({ status: 400 })));
    const fixture = TestBed.createComponent(RedefinirSenhaComponent); const component = fixture.componentInstance;
    component['form'].setValue({ novaSenha: 'abcdefgh', confirmarSenha: 'abcdefgh' }); component['onSubmit'](); component['onSubmit'](); fixture.detectChanges();
    expect(auth.redefinirSenha).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Solicitar novo link'); fixture.destroy();
  });
});
