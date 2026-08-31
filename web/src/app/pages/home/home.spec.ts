import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';

import { ContaService } from '../../core/services/conta.service';
import { EspacoContextService } from '../../core/services/espaco-context.service';
import { MovimentoService } from '../../core/services/movimento.service';
import { OrcamentoService } from '../../core/services/orcamento.service';
import {
  ComparativoPorTipoResponse,
  Conta,
  Espaco,
  ResumoPorCategoriaResponse,
} from '../../shared';
import { HomeComponent } from './home';

interface DashboardResponses {
  contas: Subject<Conta[]>;
  periodosOrcamento: Subject<string[]>;
  periodosMovimento: Subject<string[]>;
  comparativo: Subject<ComparativoPorTipoResponse>;
  resumo: Subject<ResumoPorCategoriaResponse>;
}

describe('HomeComponent', () => {
  const espaco = (id: number): Espaco => ({
    id,
    nome: `Espaço ${id}`,
    tipo: 'SHARED',
    ownerUsuarioId: 1,
    papel: 'OWNER',
  });
  const conta = (id: number, nome: string): Conta => ({
    id,
    usuarioId: 1,
    nome,
    tags: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
  const comparativo = (valor: number): ComparativoPorTipoResponse => ({
    periodos: ['2026-08'],
    receitas: [valor],
    despesas: [],
    reservas: [],
  });
  const resumo = (categoriaId: number, valor: number): ResumoPorCategoriaResponse => ({
    receitas: [{ categoriaId, categoriaNome: `Categoria ${categoriaId}`, total: valor }],
    despesas: [],
    reservas: [],
  });

  let selected: ReturnType<typeof signal<Espaco | null>>;
  let contaService: { getAll: jest.Mock };
  let orcamentoService: { findPeriodos: jest.Mock };
  let movimentoService: {
    findPeriodos: jest.Mock;
    findComparativoPorTipo: jest.Mock;
    findResumoPorCategoria: jest.Mock;
  };

  beforeEach(() => {
    selected = signal<Espaco | null>(espaco(1));
    contaService = { getAll: jest.fn() };
    orcamentoService = { findPeriodos: jest.fn() };
    movimentoService = {
      findPeriodos: jest.fn(),
      findComparativoPorTipo: jest.fn(),
      findResumoPorCategoria: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: ContaService, useValue: contaService },
        { provide: OrcamentoService, useValue: orcamentoService },
        { provide: MovimentoService, useValue: movimentoService },
        { provide: EspacoContextService, useValue: { selected } },
      ],
    });
  });

  it('recarrega todas as fontes e substitui o estado ao trocar de espaço', () => {
    contaService.getAll.mockImplementation(() =>
      of([conta(selected()!.id, `Conta ${selected()!.id}`)]),
    );
    orcamentoService.findPeriodos.mockImplementation(() => of([`2026-0${selected()!.id}`]));
    movimentoService.findPeriodos.mockImplementation(() => of([`2025-0${selected()!.id}`]));
    movimentoService.findComparativoPorTipo.mockImplementation(() =>
      of(comparativo(selected()!.id * 100)),
    );
    movimentoService.findResumoPorCategoria.mockImplementation(() =>
      of(resumo(selected()!.id, selected()!.id * 10)),
    );

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.contas()[0].nome).toBe('Conta 1');
    selected.set(espaco(2));
    fixture.detectChanges();

    expect(contaService.getAll).toHaveBeenCalledTimes(2);
    expect(orcamentoService.findPeriodos).toHaveBeenCalledTimes(2);
    expect(movimentoService.findPeriodos).toHaveBeenCalledTimes(2);
    expect(movimentoService.findComparativoPorTipo).toHaveBeenCalledTimes(2);
    expect(movimentoService.findResumoPorCategoria).toHaveBeenCalledTimes(2);
    expect(component.contaId()).toBeNull();
    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
    expect(component.contas()[0].nome).toBe('Conta 2');
    expect(component.resumo().receitas[0].categoriaId).toBe(2);
    expect(component.comparativo().receitas).toEqual([200]);

    selected.set(espaco(2));
    fixture.detectChanges();
    expect(contaService.getAll).toHaveBeenCalledTimes(2);
  });

  it('cancela respostas obsoletas em uma troca rápida de espaços', () => {
    const responses = new Map<number, DashboardResponses>();
    const getResponse = <T>(key: keyof DashboardResponses): Observable<T> =>
      responses.get(selected()!.id)![key] as Observable<T>;
    contaService.getAll.mockImplementation(() => getResponse<Conta[]>('contas'));
    orcamentoService.findPeriodos.mockImplementation(() =>
      getResponse<string[]>('periodosOrcamento'),
    );
    movimentoService.findPeriodos.mockImplementation(() =>
      getResponse<string[]>('periodosMovimento'),
    );
    movimentoService.findComparativoPorTipo.mockImplementation(() =>
      getResponse<ComparativoPorTipoResponse>('comparativo'),
    );
    movimentoService.findResumoPorCategoria.mockImplementation(() =>
      getResponse<ResumoPorCategoriaResponse>('resumo'),
    );

    const createResponses = (): DashboardResponses => ({
      contas: new Subject<Conta[]>(),
      periodosOrcamento: new Subject<string[]>(),
      periodosMovimento: new Subject<string[]>(),
      comparativo: new Subject<ComparativoPorTipoResponse>(),
      resumo: new Subject<ResumoPorCategoriaResponse>(),
    });
    const completeResponses = (id: number) => {
      const current = responses.get(id)!;
      current.contas.next([conta(id, `Conta ${id}`)]);
      current.contas.complete();
      current.periodosOrcamento.next([`2026-0${id}`]);
      current.periodosOrcamento.complete();
      current.periodosMovimento.next([`2025-0${id}`]);
      current.periodosMovimento.complete();
      current.comparativo.next(comparativo(id * 100));
      current.comparativo.complete();
      current.resumo.next(resumo(id, id * 10));
      current.resumo.complete();
    };

    responses.set(1, createResponses());
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    completeResponses(1);

    responses.set(2, createResponses());
    selected.set(espaco(2));
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    expect(component.contaId()).toBeNull();
    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
    expect(component.contas()).toEqual([]);
    expect(component.resumo()).toEqual({ receitas: [], despesas: [], reservas: [] });
    expect(component.comparativo().periodos).toEqual([]);

    responses.set(3, createResponses());
    selected.set(espaco(3));
    fixture.detectChanges();
    completeResponses(3);
    fixture.detectChanges();

    expect(component.contas()[0].nome).toBe('Conta 3');
    expect(component.resumo().receitas[0].categoriaId).toBe(3);
    expect(component.comparativo().receitas).toEqual([300]);

    completeResponses(2);
    fixture.detectChanges();
    expect(component.contas()[0].nome).toBe('Conta 3');
    expect(component.resumo().receitas[0].categoriaId).toBe(3);
    expect(component.comparativo().receitas).toEqual([300]);
  });

  it('limpa todos os dados quando a seleção de espaço fica vazia', () => {
    contaService.getAll.mockReturnValue(of([conta(1, 'Conta 1')]));
    orcamentoService.findPeriodos.mockReturnValue(of(['2026-07']));
    movimentoService.findPeriodos.mockReturnValue(of(['2026-08']));
    movimentoService.findComparativoPorTipo.mockReturnValue(of(comparativo(100)));
    movimentoService.findResumoPorCategoria.mockReturnValue(of(resumo(1, 10)));

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    expect(component.contas()).toHaveLength(1);

    selected.set(null);
    fixture.detectChanges();

    expect(component.contaId()).toBeNull();
    expect(component.chosedPeriodo()).toBeUndefined();
    expect(component.contas()).toEqual([]);
    expect(component.periodos()).toEqual([]);
    expect(component.resumo()).toEqual({ receitas: [], despesas: [], reservas: [] });
    expect(component.comparativo()).toEqual({
      periodos: [],
      receitas: [],
      despesas: [],
      reservas: [],
    });
    expect(contaService.getAll).toHaveBeenCalledTimes(1);
  });

  it('mantém o novo espaço vazio quando uma fonte falha', () => {
    contaService.getAll.mockReturnValue(of([conta(1, 'Conta 1')]));
    orcamentoService.findPeriodos.mockReturnValue(of(['2026-07']));
    movimentoService.findPeriodos.mockReturnValue(of(['2026-08']));
    movimentoService.findComparativoPorTipo.mockReturnValue(of(comparativo(100)));
    movimentoService.findResumoPorCategoria.mockReturnValue(of(resumo(1, 10)));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    expect(component.contas()[0].nome).toBe('Conta 1');

    contaService.getAll.mockReturnValue(throwError(() => new Error('falha no espaço 2')));
    selected.set(espaco(2));
    fixture.detectChanges();

    expect(component.chosedPeriodo()).toBe(component.currentPeriodo);
    expect(component.contas()).toEqual([]);
    expect(component.periodos()).toEqual([]);
    expect(component.resumo()).toEqual({ receitas: [], despesas: [], reservas: [] });
    expect(component.comparativo()).toEqual({
      periodos: [],
      receitas: [],
      despesas: [],
      reservas: [],
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Erro ao carregar dashboard:',
      expect.any(Error),
    );
  });

  it('não sobrescreve um filtro manual com a resposta inicial tardia', () => {
    const dashboardContas = new Subject<Conta[]>();
    const dashboardPeriodosOrcamento = new Subject<string[]>();
    const dashboardPeriodosMovimento = new Subject<string[]>();
    const dashboardComparativo = new Subject<ComparativoPorTipoResponse>();
    const dashboardResumo = new Subject<ResumoPorCategoriaResponse>();
    const resumoManual = new Subject<ResumoPorCategoriaResponse>();

    contaService.getAll.mockReturnValue(dashboardContas);
    orcamentoService.findPeriodos.mockReturnValue(dashboardPeriodosOrcamento);
    movimentoService.findPeriodos.mockReturnValue(dashboardPeriodosMovimento);
    movimentoService.findComparativoPorTipo.mockReturnValue(dashboardComparativo);
    movimentoService.findResumoPorCategoria
      .mockReturnValueOnce(dashboardResumo)
      .mockReturnValueOnce(resumoManual);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.loadResumo('2026-07');
    resumoManual.next(resumo(7, 70));
    resumoManual.complete();

    dashboardContas.next([conta(1, 'Conta 1')]);
    dashboardContas.complete();
    dashboardPeriodosOrcamento.next(['2026-07']);
    dashboardPeriodosOrcamento.complete();
    dashboardPeriodosMovimento.next(['2026-08']);
    dashboardPeriodosMovimento.complete();
    dashboardComparativo.next(comparativo(100));
    dashboardComparativo.complete();
    dashboardResumo.next(resumo(8, 80));
    dashboardResumo.complete();

    expect(component.chosedPeriodo()).toBe('2026-07');
    expect(component.resumo().receitas[0].categoriaId).toBe(7);
  });

  it('mantém o loading enquanto qualquer carregamento estiver pendente', () => {
    const dashboardContas = new Subject<Conta[]>();
    const dashboardPeriodosOrcamento = new Subject<string[]>();
    const dashboardPeriodosMovimento = new Subject<string[]>();
    const dashboardComparativo = new Subject<ComparativoPorTipoResponse>();
    const dashboardResumo = new Subject<ResumoPorCategoriaResponse>();
    const resumoManual = new Subject<ResumoPorCategoriaResponse>();

    contaService.getAll.mockReturnValue(dashboardContas);
    orcamentoService.findPeriodos.mockReturnValue(dashboardPeriodosOrcamento);
    movimentoService.findPeriodos.mockReturnValue(dashboardPeriodosMovimento);
    movimentoService.findComparativoPorTipo.mockReturnValue(dashboardComparativo);
    movimentoService.findResumoPorCategoria
      .mockReturnValueOnce(dashboardResumo)
      .mockReturnValueOnce(resumoManual);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.loadResumo('2026-07');
    resumoManual.next(resumo(7, 70));
    resumoManual.complete();

    expect(component.isLoading()).toBe(true);
  });

  it('não faz requisições sem um espaço selecionado', () => {
    selected.set(null);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    component.loadResumo('2026-07');

    expect(contaService.getAll).not.toHaveBeenCalled();
    expect(orcamentoService.findPeriodos).not.toHaveBeenCalled();
    expect(movimentoService.findPeriodos).not.toHaveBeenCalled();
    expect(movimentoService.findComparativoPorTipo).not.toHaveBeenCalled();
    expect(movimentoService.findResumoPorCategoria).not.toHaveBeenCalled();
  });

  it('cancela os requests pendentes ao destruir o componente', () => {
    const dashboardContas = new Subject<Conta[]>();
    const dashboardPeriodosOrcamento = new Subject<string[]>();
    const dashboardPeriodosMovimento = new Subject<string[]>();
    const dashboardComparativo = new Subject<ComparativoPorTipoResponse>();
    const dashboardResumo = new Subject<ResumoPorCategoriaResponse>();
    const resumoManual = new Subject<ResumoPorCategoriaResponse>();

    contaService.getAll.mockReturnValue(dashboardContas);
    orcamentoService.findPeriodos.mockReturnValue(dashboardPeriodosOrcamento);
    movimentoService.findPeriodos.mockReturnValue(dashboardPeriodosMovimento);
    movimentoService.findComparativoPorTipo.mockReturnValue(dashboardComparativo);
    movimentoService.findResumoPorCategoria
      .mockReturnValueOnce(dashboardResumo)
      .mockReturnValueOnce(resumoManual);

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    component.loadResumo('2026-07');

    expect(dashboardContas.observed).toBe(true);
    expect(resumoManual.observed).toBe(true);

    fixture.destroy();

    expect(dashboardContas.observed).toBe(false);
    expect(resumoManual.observed).toBe(false);
  });
});