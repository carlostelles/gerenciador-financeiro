import { ConfigService } from '@nestjs/config';
import { MovimentoComprovanteStorageService } from './movimento-comprovante-storage.service';

describe('MovimentoComprovanteStorageService', () => {
  it('usa a mesma chave S3 para a mesma chave de idempotencia', async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'AWS_S3_BUCKET_NAME' ? 'bucket-teste' : undefined,
      ),
    } as unknown as ConfigService;
    const service = new MovimentoComprovanteStorageService(config);
    const send = jest.fn().mockResolvedValue({});
    (service as any).client = { send };
    const arquivo = {
      originalname: 'Extrato Agosto.pdf',
      mimetype: 'application/pdf',
      size: 3,
      buffer: Buffer.from('pdf'),
    };

    const primeiro = await service.uploadComprovante(
      1,
      arquivo,
      'whatsapp:wamid-1:hash',
    );
    const segundo = await service.uploadComprovante(
      1,
      arquivo,
      'whatsapp:wamid-1:hash',
    );

    expect(primeiro.key).toBe(segundo.key);
    expect(primeiro.key).toMatch(
      /^movimentacoes\/1\/idempotente\/[a-f0-9]{64}-extrato-agosto\.pdf$/,
    );
    expect(send.mock.calls[0][0].input.Key).toBe(
      send.mock.calls[1][0].input.Key,
    );
  });
});
