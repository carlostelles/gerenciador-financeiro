import { of } from 'rxjs';

import { EspacoContextService } from './espaco-context.service';

describe('EspacoContextService', () => {
  const http = { get: jest.fn() } as any;

  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('não permite edição antes de carregar um espaço', () => {
    const service = new EspacoContextService(http);

    expect(service.canEdit()).toBe(false);
  });

  it('seleciona o primeiro espaço ao carregar sem seleção persistida', () => {
    http.get.mockReturnValue(
      of([
        { papel: 'OWNER', espaco: { id: 3, nome: 'Pessoal' } },
        { papel: 'VIEWER', espaco: { id: 8, nome: 'Família' } },
      ]),
    );
    const service = new EspacoContextService(http);

    service.load().subscribe();

    expect(service.selected()?.id).toBe(3);
    expect(service.selected()?.papel).toBe('OWNER');
    expect(service.canEdit()).toBe(true);
  });

  it('mantém VIEWER em modo somente leitura', () => {
    http.get.mockReturnValue(
      of([{ papel: 'VIEWER', espaco: { id: 8, nome: 'Família' } }]),
    );
    const service = new EspacoContextService(http);

    service.load().subscribe();

    expect(service.canEdit()).toBe(false);
  });

  it('persiste a troca de espaço', () => {
    http.get.mockReturnValue(
      of([{ papel: 'EDITOR', espaco: { id: 8, nome: 'Família' } }]),
    );
    const service = new EspacoContextService(http);
    service.load().subscribe();

    service.select(8);

    expect(sessionStorage.getItem('espacoId')).toBe('8');
  });

  it('remove o espaço local e seleciona o primeiro restante', () => {
    http.get.mockReturnValue(
      of([
        { papel: 'OWNER', espaco: { id: 3, nome: 'Pessoal', tipo: 'PERSONAL' } },
        { papel: 'OWNER', espaco: { id: 8, nome: 'Família', tipo: 'SHARED' } },
      ]),
    );
    const service = new EspacoContextService(http);
    service.load().subscribe();
    service.select(8);

    service.removeLocal(8);

    expect(service.selected()?.id).toBe(3);
    expect(sessionStorage.getItem('espacoId')).toBe('3');
  });

  it('expõe estado vazio ao remover o último espaço', () => {
    http.get.mockReturnValue(
      of([{ papel: 'VIEWER', espaco: { id: 8, nome: 'Família', tipo: 'SHARED' } }]),
    );
    const service = new EspacoContextService(http);
    service.load().subscribe();

    service.removeLocal(8);

    expect(service.selected()).toBeNull();
    expect(service.spaces()).toEqual([]);
    expect(sessionStorage.getItem('espacoId')).toBeNull();
  });
});
