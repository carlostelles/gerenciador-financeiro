import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WhatsappService],
    });

    service = TestBed.inject(WhatsappService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar inbox inbound com filtro de status', () => {
    service.listarInbound('PROCESSADA', 10).subscribe((resp) => {
      expect(resp.length).toBe(1);
      expect(resp[0].statusProcessamento).toBe('PROCESSADA');
    });

    const req = httpMock.expectOne(
      'http://localhost:3000/whatsapp/inbound?limit=10&status=PROCESSADA',
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, statusProcessamento: 'PROCESSADA' }]);
  });

  it('deve listar inbox inbound sem filtro de status', () => {
    service.listarInbound(undefined, 5).subscribe((resp) => {
      expect(resp.length).toBe(1);
    });

    const req = httpMock.expectOne('http://localhost:3000/whatsapp/inbound?limit=5');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 2 }]);
  });
});
