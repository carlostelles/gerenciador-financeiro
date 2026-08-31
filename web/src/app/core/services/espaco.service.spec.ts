import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EspacoService } from './espaco.service';

describe('EspacoService', () => {
  let service: EspacoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EspacoService],
    });
    service = TestBed.inject(EspacoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cria, renomeia e exclui espaços pelos endpoints dedicados', () => {
    service.create('Família').subscribe();
    const create = http.expectOne('http://localhost:3000/espacos');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ nome: 'Família' });
    create.flush({ id: 7, nome: 'Família', tipo: 'SHARED' });

    service.rename(7, 'Casa').subscribe();
    const rename = http.expectOne('http://localhost:3000/espacos/7');
    expect(rename.request.method).toBe('PATCH');
    expect(rename.request.body).toEqual({ nome: 'Casa' });
    rename.flush({ id: 7, nome: 'Casa', tipo: 'SHARED' });

    service.remove(7).subscribe();
    const remove = http.expectOne('http://localhost:3000/espacos/7');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('inclui membro por email exato e papel', () => {
    service.addMember(7, 'pessoa@example.com', 'EDITOR').subscribe();

    const request = http.expectOne('http://localhost:3000/espacos/7/membros');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'pessoa@example.com',
      papel: 'EDITOR',
    });
    request.flush({});
  });

  it('altera papel e revoga membro pelos endpoints do espaço', () => {
    service.updateMember(7, 12, 'VIEWER').subscribe();
    const update = http.expectOne('http://localhost:3000/espacos/7/membros/12');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ papel: 'VIEWER' });
    update.flush({});

    service.removeMember(7, 12).subscribe();
    const remove = http.expectOne('http://localhost:3000/espacos/7/membros/12');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('permite saída e transferência pelos contratos dedicados', () => {
    service.leave(7).subscribe();
    const leave = http.expectOne('http://localhost:3000/espacos/7/sair');
    expect(leave.request.method).toBe('POST');
    leave.flush(null);

    service.transfer(7, 12).subscribe();
    const transfer = http.expectOne(
      'http://localhost:3000/espacos/7/transferir-propriedade',
    );
    expect(transfer.request.method).toBe('POST');
    expect(transfer.request.body).toEqual({ usuarioId: 12 });
    transfer.flush(null);
  });
});
