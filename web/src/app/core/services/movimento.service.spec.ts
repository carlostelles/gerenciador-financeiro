import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { MovimentoService } from './movimento.service';

describe('MovimentoService', () => {
  let service: MovimentoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MovimentoService],
    });

    service = TestBed.inject(MovimentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should upload receipt for analysis using multipart form data', () => {
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });

    service.analisarComprovante(file).subscribe((response) => {
      expect(response.status).toBe(202);
      expect(response.body?.comprovanteId).toBe(1);
    });

    const req = httpMock.expectOne('http://localhost:3000/movimentacoes/comprovantes/analisar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTruthy();
    expect((req.request.body as FormData).get('arquivo')).toBe(file);
    req.flush({
      comprovanteId: 1,
      nomeArquivo: 'receipt.pdf',
      tipoArquivo: 'application/pdf',
      tamanhoArquivo: 7,
      caminhoArquivo: 's3://bucket/receipt.pdf',
      sugestao: {
        data: '2026-07-13',
        periodo: '2026-07',
        valor: 10,
        descricao: 'Teste',
        categoriaId: 2,
        categoriaNome: 'Mercado',
        contaId: 3,
        contaNome: 'Carteira',
      },
      camposObrigatoriosFaltantes: [],
      salvamento: {
        status: 'pendente',
      },
    }, { status: 202, statusText: 'Accepted' });
  });
});