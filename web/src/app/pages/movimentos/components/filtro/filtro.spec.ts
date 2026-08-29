import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { CategoriaService } from '../../../../core/services/categoria.service';
import { MovimentosFiltroComponent } from './filtro';

describe('MovimentosFiltroComponent', () => {
  let completeWith: jest.Mock;

  beforeEach(() => {
    completeWith = jest.fn();
    TestBed.configureTestingModule({
      imports: [MovimentosFiltroComponent],
      providers: [
        { provide: CategoriaService, useValue: { getAll: jest.fn().mockReturnValue(of([])) } },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {
            data: { contaId: 7, categoriaId: 3, descricao: ' mercado ' },
            completeWith,
            $implicit: { complete: jest.fn() },
          },
        },
      ],
    });
  });

  it('mantém somente categoria e descrição e ignora conta legada', () => {
    const fixture = TestBed.createComponent(MovimentosFiltroComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    expect(component.filtroForm.contains('contaId')).toBe(false);
    expect(fixture.nativeElement.querySelector('[formControlName="contaId"]')).toBeNull();

    component.onSubmit();

    expect(completeWith).toHaveBeenCalledWith({
      categoriaId: 3,
      descricao: 'mercado',
    });
  });

  it('limpa os filtros sem alterar conta ou período externos', () => {
    const fixture = TestBed.createComponent(MovimentosFiltroComponent);
    fixture.detectChanges();

    fixture.componentInstance.onClear();

    expect(completeWith).toHaveBeenCalledWith(null);
  });
});
