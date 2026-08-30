import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriaTipo } from '../../interfaces';
import { TimelineComponent, TimelineItem } from './timeline.component';

describe('TimelineComponent', () => {
  let fixture: ComponentFixture<TimelineComponent>;

  const item: TimelineItem = {
    id: 1,
    data: '2026-08-30',
    categoriaTipo: CategoriaTipo.DESPESA,
    categoriaNome: 'Moradia',
    categoriaAusente: false,
    descricao: 'Aluguel',
    valor: 1200,
    revisado: false,
    raw: { comprovante: { id: 7 } },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineComponent);
    fixture.componentRef.setInput('items', [item]);
  });

  it('mantém comprovante visível e oculta ações de escrita em modo leitura', () => {
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[title="Visualizar anexo"]')).not.toBeNull();
    expect(element.querySelector('[title="Marcar como revisado"]')).toBeNull();
    expect(element.querySelector('[title="Duplicar"]')).toBeNull();
    expect(element.querySelector('[title="Editar"]')).toBeNull();
    expect(element.querySelector('[title="Excluir"]')).toBeNull();
  });
});
