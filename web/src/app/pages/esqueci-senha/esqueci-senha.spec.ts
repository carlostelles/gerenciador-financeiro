import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { EsqueciSenhaComponent } from './esqueci-senha';
import { AuthService } from '../../core/services/auth.service';

describe('Solicitar recuperação', () => {
  const auth = { solicitarRecuperacao: jest.fn() };
  beforeEach(async () => {
    jest.useFakeTimers(); auth.solicitarRecuperacao.mockReset();
    await TestBed.configureTestingModule({ imports: [EsqueciSenhaComponent], providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }] }).compileComponents();
  });
  afterEach(() => { jest.useRealTimers(); });
  it('renderiza somente e-mail, preserva valor e cooldown de 60s', () => {
    auth.solicitarRecuperacao.mockReturnValue(of({ message: 'Se houver uma conta ativa...' }));
    const fixture = TestBed.createComponent(EsqueciSenhaComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('O link expira 5 minutos após a solicitação. O tempo de entrega conta nesse prazo.');
    component['form'].setValue({ email: 'test@example.com' }); component['onSubmit']();
    expect(component['form'].value.email).toBe('test@example.com');
    component['onSubmit'](); expect(auth.solicitarRecuperacao).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60000); component['onSubmit']();
    expect(auth.solicitarRecuperacao).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });
  it('não duplica envio em loading e preserva email em erro', () => {
    const pending = new Subject<any>(); auth.solicitarRecuperacao.mockReturnValue(pending);
    const fixture = TestBed.createComponent(EsqueciSenhaComponent); const component = fixture.componentInstance;
    component['form'].setValue({ email: 'test@example.com' }); component['onSubmit'](); component['onSubmit']();
    expect(auth.solicitarRecuperacao).toHaveBeenCalledTimes(1);
    pending.error({ status: 503 });
    expect(component['form'].value.email).toBe('test@example.com'); expect(component['isLoading']).toBe(false);
    fixture.destroy();
  });
});