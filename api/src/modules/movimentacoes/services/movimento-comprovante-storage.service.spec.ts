import { ConfigService } from '@nestjs/config';
import { MovimentoComprovanteStorageService } from './movimento-comprovante-storage.service';

describe('MovimentoComprovanteStorageService', () => {
  it('envia o comprovante para uma chave única da movimentação', async () => {
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

    const primeiro = await service.uploadComprovante(1, arquivo);
    const segundo = await service.uploadComprovante(1, arquivo);

    expect(primeiro.key).toMatch(
      /^movimentacoes\/1\/\d{4}\/\d{2}\/[0-9a-f-]{36}-extrato-agosto\.pdf$/,
    );
    expect(segundo.key).not.toBe(primeiro.key);
    expect(primeiro.caminhoArquivo).toBe(`s3://bucket-teste/${primeiro.key}`);
    expect(send.mock.calls[0][0].input).toEqual(
      expect.objectContaining({
        Bucket: 'bucket-teste',
        Key: primeiro.key,
        Body: arquivo.buffer,
        ContentType: 'application/pdf',
      }),
    );
  });
});
