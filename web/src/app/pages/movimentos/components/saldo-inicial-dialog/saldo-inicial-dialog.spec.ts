import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { SaldoInicialDialogComponent } from './saldo-inicial-dialog';
import { MovimentoService } from '../../../../core/services/movimento.service';
import { SaldoInicial, ToastService } from '../../../../shared';

describe('SaldoInicialDialogComponent', () => {
  const saldoManual = {
    id: 1,
    usuarioId: 2,
    contaId: 7,
    periodo: '2026-08',
    valor: 50,
    origem: 'MANUAL',
    criadoPorManual: true,
  } as SaldoInicial;
  let movimentoService: Record<string, jest.Mock>;
  let context: { data: unknown; completeWith: jest.Mock; $implicit: { complete: jest.Mock } };

  beforeEach(() => {
    movimentoService = {
      updateSaldoInicial: jest.fn().mockReturnValue(of({ ...saldoManual, valor: -80 })),
      restaurarSaldoInicialAutomatico: jest.fn().mockReturnValue(of({
        ...saldoManual,
        valor: 125,
        origem: 'AUTO',
        criadoPorManual: false,
      })),
    };
    context = {
      data: { saldoInicial: saldoManual, contaId: 7, periodo: '2026-08' },
      completeWith: jest.fn(),
      $implicit: { complete: jest.fn() },
    };

    TestBed.configureTestingModule({
      imports: [SaldoInicialDialogComponent],
      providers: [
        { provide: MovimentoService, useValue: movimentoService },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
        { provide: POLYMORPHEUS_CONTEXT, useValue: context },
      ],
    });
  });

  it('salva manualmente um valor negativo', () => {
    const fixture = TestBed.createComponent(SaldoInicialDialogComponent);
    const component = fixture.componentInstance as any;
    component.form.controls.valor.setValue(-80);

    component.salvar();

    expect(movimentoService.updateSaldoInicial).toHaveBeenCalledWith('2026-08', 7, -80);
    expect(context.completeWith).toHaveBeenCalledWith(
      expect.objectContaining({ valor: -80 }),
    );
  });

  it('restaura o cálculo automático', () => {
    const fixture = TestBed.createComponent(SaldoInicialDialogComponent);

    fixture.componentInstance.restaurarAutomatico();

    expect(movimentoService.restaurarSaldoInicialAutomatico).toHaveBeenCalledWith(
      '2026-08',
      7,
    );
    expect(context.completeWith).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'AUTO', valor: 125 }),
    );
  });
});
