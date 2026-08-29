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
  let orcamentoService: Record<string, jest.Mock>;
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
    orcamentoService = {
      findPeriodos: jest.fn().mockReturnValue(of([])),
      findByPeriodo: jest.fn().mockReturnValue(of(null)),
    };
    contaService = { getAll: jest.fn().mockReturnValue(of([conta])) };
    toast = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [MovimentosComponent],
      providers: [
        { provide: MovimentoService, useValue: movimentoService },
        { provide: OrcamentoService, useValue: orcamentoService },
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

  it('combina, deduplica e ordena períodos decrescentemente, mantendo o mês atual como padrão', () => {
    orcamentoService.findPeriodos.mockReturnValue(of(['2025-12', '2026-02', '2025-12']));
    movimentoService.findPeriodos.mockReturnValue(of(['2026-01', '2026-02']));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const expected = Array.from(
      new Set(['2025-12', '2026-02', '2025-12', '2026-01', '2026-02', component.currentPeriodo]),
    ).sort((first, second) => second.localeCompare(first));

    expect(component.periodos()).toEqual(expected);
    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
    expect(movimentoService.getAll).toHaveBeenCalledWith(
      component.currentPeriodo,
      expect.objectContaining({ contaId: 7 }),
    );
  });

  it('oferece e seleciona o mês atual quando as fontes de períodos estão vazias', () => {
    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.periodos()).toEqual([component.currentPeriodo]);
    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
  });

  it('usa o mês atual como fallback e avisa quando a consulta de períodos falha', () => {
    orcamentoService.findPeriodos.mockReturnValue(
      throwError(() => new Error('períodos indisponíveis')),
    );

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.periodos()).toEqual([component.currentPeriodo]);
    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
    expect(movimentoService.getAll).toHaveBeenCalledWith(
      component.currentPeriodo,
      expect.objectContaining({ contaId: 7 }),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível carregar os períodos. Exibindo o mês atual.',
    );
  });

  it('troca o período preservando conta e filtros e limpa dados anteriores durante a carga', () => {
    const novosMovimentos = new Subject<any[]>();
    movimentoService.getAll.mockReturnValue(novosMovimentos);

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    component.movimentos.set([{ id: 99, contaId: 7, valor: 999 }]);
    component.orcamento.set({ periodo: component.currentPeriodo, items: [] });
    component.filtro.set({ categoriaId: 3, descricao: 'aluguel' });

    component.onPeriodoChange('2025-12');

    expect(component.chosedPeriodo()).toBe('2025-12');
    expect(component.contaId()).toBe(7);
    expect(component.filtro()).toEqual({ categoriaId: 3, descricao: 'aluguel' });
    expect(component.movimentos()).toEqual([]);
    expect(component.orcamento()).toBeNull();
    expect(movimentoService.getAll).toHaveBeenLastCalledWith('2025-12', {
      categoriaId: 3,
      descricao: 'aluguel',
      contaId: 7,
    });
    expect(movimentoService.getSaldoInicial).toHaveBeenLastCalledWith('2025-12', 7);
    expect(orcamentoService.findByPeriodo).toHaveBeenLastCalledWith('2025-12');
  });

  it('ignora respostas de movimentações antigas após trocar de período', () => {
    const movimentosAtuais = new Subject<any[]>();
    movimentoService.getAll.mockImplementation((periodo) =>
      periodo === '2025-12'
        ? of([{ id: 12, periodo, contaId: 7, valor: 20 }])
        : movimentosAtuais,
    );

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.onPeriodoChange('2025-12');
    movimentosAtuais.next([{ id: 1, periodo: component.currentPeriodo, contaId: 7, valor: 999 }]);

    expect(component.chosedPeriodo()).toBe('2025-12');
    expect(component.movimentos()).toEqual([
      expect.objectContaining({ id: 12, periodo: '2025-12' }),
    ]);
  });

  it('ignora orçamento antigo em uma sequência de períodos A-B-A', () => {
    const primeiroOrcamentoAtual = new Subject<any>();
    let chamadasPeriodoAtual = 0;
    orcamentoService.findByPeriodo.mockImplementation((periodo) => {
      if (periodo !== '2025-12') {
        chamadasPeriodoAtual++;
        return chamadasPeriodoAtual === 1
          ? primeiroOrcamentoAtual
          : of({ id: 3, periodo, descricao: 'Orçamento atual', items: [] });
      }
      return of({ id: 2, periodo, descricao: 'Orçamento intermediário', items: [] });
    });

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const periodoAtual = component.currentPeriodo;

    component.onPeriodoChange('2025-12');
    component.onPeriodoChange(periodoAtual);
    primeiroOrcamentoAtual.next({
      id: 1,
      periodo: periodoAtual,
      descricao: 'Orçamento obsoleto',
      items: [],
    });

    expect(component.orcamento()).toEqual(
      expect.objectContaining({ id: 3, descricao: 'Orçamento atual' }),
    );
  });

  it('mantém os seletores desabilitados e a orientação quando não há contas', () => {
    contaService.getAll.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();

    const periodoInput = fixture.nativeElement.querySelector('#periodo') as HTMLInputElement;
    const contaInput = fixture.nativeElement.querySelector('#contaId') as HTMLInputElement;
    expect(periodoInput.disabled).toBe(true);
    expect(contaInput.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.empty-accounts')?.textContent).toContain(
      'Nenhuma conta cadastrada',
    );
    expect(movimentoService.getAll).not.toHaveBeenCalled();
  });

  it('renderiza seletores estritos e não renderiza tabs', () => {
    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tui-tabs-with-more')).toBeNull();
    expect(fixture.nativeElement.querySelector('#periodo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#contaId')).not.toBeNull();
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
