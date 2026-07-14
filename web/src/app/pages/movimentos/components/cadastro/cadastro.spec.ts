import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDay } from '@taiga-ui/cdk';

import { OrcamentosCadastroComponent } from './cadastro';
import { MovimentoService } from '../../../../core/services/movimento.service';
import { ContaService } from '../../../../core/services/conta.service';
import { ToastService } from '../../../../shared';

describe('OrcamentosCadastroComponent', () => {
  let component: OrcamentosCadastroComponent;
  let fixture: ComponentFixture<OrcamentosCadastroComponent>;
  let movimentoService: jest.Mocked<MovimentoService>;

  beforeEach(async () => {
    movimentoService = {
      findCategoriasForPeriodo: jest.fn().mockReturnValue(of({
        orcamentoItens: [],
        categorias: [
          {
            categoriaId: 7,
            categoriaNome: 'Alimentação',
            categoriaTipo: 'DESPESA',
            source: 'categoria',
          },
        ],
      })),
      analisarComprovante: jest.fn().mockReturnValue(of({
        comprovanteId: 11,
        nomeArquivo: 'receipt.pdf',
        tipoArquivo: 'application/pdf',
        tamanhoArquivo: 100,
        caminhoArquivo: 's3://bucket/receipt.pdf',
        sugestao: {
          data: '2026-07-13',
          periodo: '2026-07',
          valor: 59.9,
          descricao: 'Pagamento via PIX',
          categoriaId: 7,
          categoriaNome: 'Alimentação',
          contaId: 2,
          contaNome: 'Conta Corrente',
        },
        camposObrigatoriosFaltantes: [],
      })),
      create: jest.fn().mockReturnValue(of({} as any)),
      update: jest.fn().mockReturnValue(of({} as any)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [OrcamentosCadastroComponent],
      providers: [
        {
          provide: MovimentoService,
          useValue: movimentoService,
        },
        {
          provide: ContaService,
          useValue: {
            getAll: jest.fn().mockReturnValue(of([{ id: 2, nome: 'Conta Corrente' }])),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {
            data: undefined,
            completeWith: jest.fn(),
            $implicit: { complete: jest.fn() },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrcamentosCadastroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should autofill form after receipt analysis', () => {
    const file = new File(['pdf'], 'receipt.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [file],
    });

    component.onReceiptSelected({ target: input } as unknown as Event);

    expect(movimentoService.analisarComprovante).toHaveBeenCalledWith(file);
    expect(component.movimentoForm.get('valor')?.value).toBe(59.9);
    expect(component.movimentoForm.get('descricao')?.value).toBe('Pagamento via PIX');
    expect(component.movimentoForm.get('contaId')?.value).toBe(2);
    expect(component.movimentoForm.get('categoriaOption')?.value).toEqual(
      expect.objectContaining({ categoriaId: 7 }),
    );
    expect(component.movimentoForm.get('data')?.value).toEqual(new TuiDay(2026, 6, 13));
  });

  it('should send comprovanteId when creating movement after analysis', () => {
    component.movimentoForm.patchValue({
      data: new TuiDay(2026, 6, 13),
      valor: 59.9,
      descricao: 'Pagamento via PIX',
      contaId: 2,
      categoriaOption: {
        categoriaId: 7,
        categoriaNome: 'Alimentação',
        categoriaTipo: 'DESPESA',
        source: 'categoria',
      },
    });
    (component as any).uploadedReceiptId.set(11);
    (component as any).periodo.set('2026-07');

    component.onSubmit();

    expect(movimentoService.create).toHaveBeenCalledWith(
      '2026-07',
      expect.objectContaining({ comprovanteId: 11, categoriaId: 7 }),
    );
  });
});