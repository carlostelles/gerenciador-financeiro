import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { TuiDialogService } from '@taiga-ui/core';

import { MovimentosComponent } from './movimentos';
import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import { ContaService } from '../../core/services/conta.service';
import { PromptService, ToastService } from '../../shared';

describe('MovimentosComponent', () => {
  const conta = { id: 7, nome: 'Conta Corrente' };
  let movimentoService: Record<string, jest.Mock>;
  let contaService: { getAll: jest.Mock };
  let toast: { error: jest.Mock; success: jest.Mock };

  beforeEach(() => {
    sessionStorage.clear();
    movimentoService = {
      findPeriodos: jest.fn().mockReturnValue(of([])),
      getAll: jest.fn().mockReturnValue(of([
        { id: 1, data: '2026-08-01', valor: 100, contaId: 7, categoria: { tipo: 'RECEITA' } },
        { id: 2, data: '2026-08-02', valor: 20, contaId: 7, categoria: { tipo: 'DESPESA' } },
        { id: 3, data: '2026-08-03', valor: 30, contaId: 7, categoria: { tipo: 'RESERVA' } },
      ])),
      getSaldoInicial: jest.fn().mockReturnValue(of({
        id: 1,
        contaId: 7,
        periodo: '2026-08',
        valor: 50,
        origem: 'MANUAL',
        criadoPorManual: true,
      })),
    };
    contaService = { getAll: jest.fn().mockReturnValue(of([conta])) };
    toast = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [MovimentosComponent],
      providers: [
        { provide: MovimentoService, useValue: movimentoService },
        {
          provide: OrcamentoService,
          useValue: {
            findPeriodos: jest.fn().mockReturnValue(of([])),
            findByPeriodo: jest.fn().mockReturnValue(of(null)),
          },
        },
        { provide: ContaService, useValue: contaService },
        { provide: PromptService, useValue: { open: jest.fn() } },
        { provide: TuiDialogService, useValue: { open: jest.fn() } },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it('seleciona a única conta e calcula saldo inicial mais receitas menos despesas e reservas', () => {
    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.contaId()).toBe(7);
    expect(movimentoService.getAll).toHaveBeenCalledWith(
      component.currentPeriodo,
      expect.objectContaining({ contaId: 7 }),
    );
    expect(movimentoService.getSaldoInicial).toHaveBeenCalledWith(
      component.currentPeriodo,
      7,
    );
    expect(component.totalReservas).toBe(30);
    expect(component.saldo).toBe(100);
  });

  it('restaura durante a sessão a conta escolhida entre várias contas', () => {
    sessionStorage.setItem('movimentacoes.contaId', '8');
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();

    expect((fixture.componentInstance as any).contaId()).toBe(8);
  });

  it('mantém as movimentações disponíveis quando o saldo inicial falha', () => {
    movimentoService.getSaldoInicial.mockReturnValue(
      throwError(() => new Error('saldo indisponível')),
    );

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.movimentos()).toHaveLength(3);
    expect(component.isSaldoLoading()).toBe(false);
    expect(component.saldoInicial()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível carregar o saldo inicial desta conta.',
    );
  });

  it('ignora respostas antigas após trocar de conta', () => {
    const movimentosAntigos = new Subject<any[]>();
    const saldoAntigo = new Subject<any>();
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));
    movimentoService.getAll.mockImplementation((_periodo, filtro) =>
      filtro.contaId === 7
        ? movimentosAntigos
        : of([{ id: 8, contaId: 8, valor: 200, categoria: { tipo: 'RECEITA' } }]),
    );
    movimentoService.getSaldoInicial.mockImplementation((_periodo, contaId) =>
      contaId === 7
        ? saldoAntigo
        : of({ contaId: 8, valor: 25, origem: 'AUTO' }),
    );

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.onContaChange(8);
    movimentosAntigos.next([
      { id: 7, contaId: 7, valor: 999, categoria: { tipo: 'RECEITA' } },
    ]);
    saldoAntigo.next({ contaId: 7, valor: 999, origem: 'AUTO' });

    expect(component.contaId()).toBe(8);
    expect(component.movimentos()[0].contaId).toBe(8);
    expect(component.saldoInicial().contaId).toBe(8);
  });
});
