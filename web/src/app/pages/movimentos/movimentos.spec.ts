import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { TuiDialogService } from '@taiga-ui/core';

import { ALL_ACCOUNTS, MovimentosComponent } from './movimentos';
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
  let dialogs: { open: jest.Mock };

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
      getSaldosIniciais: jest.fn().mockReturnValue(of({
        periodo: '2026-08',
        valorTotal: 75,
        quantidadeContas: 2,
        saldos: [
          { contaId: 7, contaNome: 'Conta Corrente', valor: 50, origem: 'MANUAL' },
          { contaId: 8, contaNome: 'Carteira', valor: 25, origem: 'AUTO' },
        ],
      })),
    };
    orcamentoService = {
      findPeriodos: jest.fn().mockReturnValue(of([])),
      findByPeriodo: jest.fn().mockReturnValue(of(null)),
    };
    contaService = { getAll: jest.fn().mockReturnValue(of([conta])) };
    toast = { error: jest.fn(), success: jest.fn() };
    dialogs = { open: jest.fn().mockReturnValue(of(undefined)) };

    TestBed.configureTestingModule({
      imports: [MovimentosComponent],
      providers: [
        { provide: MovimentoService, useValue: movimentoService },
        { provide: OrcamentoService, useValue: orcamentoService },
        { provide: ContaService, useValue: contaService },
        { provide: PromptService, useValue: { open: jest.fn() } },
        { provide: TuiDialogService, useValue: dialogs },
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

  it('calcula os cards apenas com movimentos da conta selecionada mesmo se a resposta vier misturada', () => {
    movimentoService.getAll.mockReturnValue(of([
      { id: 1, contaId: 7, valor: 500, categoria: { tipo: 'RECEITA' } },
      { id: 2, contaId: 7, valor: 120, categoria: { tipo: 'DESPESA' } },
      { id: 3, contaId: 7, valor: 30, categoria: { tipo: 'RESERVA' } },
      { id: 4, contaId: 8, valor: 900, categoria: { tipo: 'RECEITA' } },
      { id: 5, contaId: 8, valor: 400, categoria: { tipo: 'DESPESA' } },
    ]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.contaId()).toBe(7);
    expect(component.totalReceitas).toBe(500);
    expect(component.totalDespesas).toBe(120);
    expect(component.totalReservas).toBe(30);
    expect(component.saldo).toBe(400);
  });

  it('recalcula os cards ao trocar a conta selecionada', () => {
    movimentoService.getAll.mockReturnValue(of([
      { id: 1, contaId: 7, valor: '100.50', categoria: { tipo: 'RECEITA' } },
      { id: 2, contaId: 8, valor: '250.75', categoria: { tipo: 'RECEITA' } },
      { id: 3, contaId: 8, valor: '40.25', orcamentoItem: { categoria: { tipo: 'DESPESA' } } },
      { id: 4, contaId: 8, valor: 10, categoria: { tipo: 'RESERVA' } },
      { id: 5, valor: 999, categoria: { tipo: 'RECEITA' } },
    ]));
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.totalReceitas).toBe(100.5);
    expect(component.totalDespesas).toBe(0);

    component.contaId.set(8);

    expect(component.totalReceitas).toBe(250.75);
    expect(component.totalDespesas).toBe(40.25);
    expect(component.totalReservas).toBe(10);
  });

  it('agrega movimentos de todas as contas quando a opção consolidada está selecionada', () => {
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));
    movimentoService.getAll.mockReturnValue(of([
      { id: 1, contaId: 7, valor: 100, categoria: { tipo: 'RECEITA' } },
      { id: 2, contaId: 8, valor: 250, categoria: { tipo: 'RECEITA' } },
      { id: 3, contaId: 7, valor: 30, categoria: { tipo: 'DESPESA' } },
      { id: 4, contaId: 8, valor: 20, categoria: { tipo: 'RESERVA' } },
    ]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.totalReceitas).toBe(350);
    expect(component.totalDespesas).toBe(30);
    expect(component.totalReservas).toBe(20);
    expect(component.saldo).toBe(375);
  });

  it('restaura durante a sessão a conta escolhida entre várias contas', () => {
    sessionStorage.setItem('movimentacoes.contaId', '8');
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();

    expect((fixture.componentInstance as any).contaId()).toBe(8);
  });

  it('usa a primeira conta quando a seleção salva é inválida', () => {
    sessionStorage.setItem('movimentacoes.contaId', '999');
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();

    expect((fixture.componentInstance as any).contaId()).toBe(7);
  });

  it('restaura Todas as contas da sessão e omite contaId ao carregar movimentos', () => {
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.contaId()).toBe(ALL_ACCOUNTS);
    expect(movimentoService.getAll).toHaveBeenCalledWith(component.currentPeriodo, {});
    expect(movimentoService.getSaldosIniciais).toHaveBeenCalledWith(component.currentPeriodo);
    expect(component.saldoInicial().valor).toBe(75);
    expect(component.saldoInicial().origem).toBe('CONSOLIDADO');
  });

  it('persiste Todas as contas e calcula o saldo final consolidado', () => {
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.onContaChange(ALL_ACCOUNTS);

    expect(sessionStorage.getItem('movimentacoes.contaId')).toBe(ALL_ACCOUNTS);
    expect(movimentoService.getAll).toHaveBeenLastCalledWith(component.currentPeriodo, {});
    expect(component.saldo).toBe(125);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Consolidado');
    expect(fixture.nativeElement.textContent).toContain('Saldo consolidado');
  });

  it('ignora conta legada ao indicar filtros ativos', () => {
    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.filtro.set({ contaId: 7 });

    expect(component.hasFiltro()).toBe(false);
  });

  it('abre a lista consolidada pelo lápis e recarrega a tela ao fechar', () => {
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));
    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    movimentoService.getAll.mockClear();

    component.openSaldoInicialModal();

    expect(dialogs.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      label: 'Saldos iniciais por conta',
      data: expect.objectContaining({ periodo: component.currentPeriodo }),
    }));
    expect(movimentoService.getAll).toHaveBeenCalledWith(component.currentPeriodo, {});
  });

  it('ignora resposta agregada antiga após trocar para uma conta individual', () => {
    const agregadoAntigo = new Subject<any>();
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));
    movimentoService.getSaldosIniciais.mockReturnValue(agregadoAntigo);

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.onContaChange(7);
    agregadoAntigo.next({
      periodo: component.currentPeriodo,
      valorTotal: 999,
      quantidadeContas: 2,
      saldos: [],
    });

    expect(component.contaId()).toBe(7);
    expect(component.saldoInicial()).toEqual(expect.objectContaining({ contaId: 7, valor: 50 }));
    expect(component.saldosIniciais()).toBeNull();
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
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
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
    expect(movimentoService.getSaldosIniciais).not.toHaveBeenCalled();
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

  it('mantém as movimentações disponíveis quando o saldo inicial agregado falha', () => {
    sessionStorage.setItem('movimentacoes.contaId', ALL_ACCOUNTS);
    contaService.getAll.mockReturnValue(of([conta, { id: 8, nome: 'Carteira' }]));
    movimentoService.getSaldosIniciais.mockReturnValue(
      throwError(() => new Error('saldos indisponíveis')),
    );

    const fixture = TestBed.createComponent(MovimentosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.movimentos()).toHaveLength(3);
    expect(component.isSaldoLoading()).toBe(false);
    expect(component.saldoInicial()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível carregar os saldos iniciais das contas.',
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
