import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { ToastService } from '../../../../shared';
import { SaldosIniciaisDialogComponent } from './saldos-iniciais-dialog';

describe('SaldosIniciaisDialogComponent', () => {
  const agregado = {
    periodo: '2026-08',
    valorTotal: 125,
    quantidadeContas: 2,
    saldos: [
      { contaId: 7, contaNome: 'Banco', valor: 150, origem: 'MANUAL' },
      { contaId: 8, contaNome: 'Carteira', valor: -25, origem: 'AUTO' },
    ],
  } as any;
  let movimentoService: Record<string, jest.Mock>;
  let dialogs: { open: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    movimentoService = {
      getSaldosIniciais: jest.fn().mockReturnValue(of({
        ...agregado,
        valorTotal: 100,
      })),
      restaurarSaldoInicialAutomatico: jest.fn().mockReturnValue(of({})),
    };
    dialogs = { open: jest.fn().mockReturnValue(of({})) };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SaldosIniciaisDialogComponent],
      providers: [
        { provide: MovimentoService, useValue: movimentoService },
        { provide: TuiDialogService, useValue: dialogs },
        { provide: ToastService, useValue: toast },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { data: { periodo: '2026-08', agregado }, $implicit: { complete: jest.fn() } },
        },
      ],
    });
  });

  it('abre a edição da conta e recarrega o agregado após salvar', () => {
    const fixture = TestBed.createComponent(SaldosIniciaisDialogComponent);
    const component = fixture.componentInstance as any;

    component.editar(agregado.saldos[0]);

    expect(dialogs.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ contaId: 7, periodo: '2026-08' }),
    }));
    expect(movimentoService.getSaldosIniciais).toHaveBeenCalledWith('2026-08');
    expect(component.agregado().valorTotal).toBe(100);
  });

  it('restaura uma conta e recarrega o agregado', () => {
    const fixture = TestBed.createComponent(SaldosIniciaisDialogComponent);
    const component = fixture.componentInstance as any;

    component.restaurar(agregado.saldos[1]);

    expect(movimentoService.restaurarSaldoInicialAutomatico).toHaveBeenCalledWith('2026-08', 8);
    expect(movimentoService.getSaldosIniciais).toHaveBeenCalledWith('2026-08');
    expect(toast.success).toHaveBeenCalledWith('Cálculo automático restaurado.');
  });

  it('preserva a lista atual quando a recarga falha', () => {
    movimentoService.getSaldosIniciais.mockReturnValue(
      throwError(() => new Error('indisponível')),
    );
    const fixture = TestBed.createComponent(SaldosIniciaisDialogComponent);
    const component = fixture.componentInstance as any;

    component.editar(agregado.saldos[0]);

    expect(component.agregado()).toEqual(agregado);
    expect(component.isLoading()).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Não foi possível recarregar os saldos iniciais.');
  });
});
