import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { MetaWhatsappClientService } from './meta-whatsapp-client.service';

describe('MetaWhatsappClientService', () => {
  const token = 'token-secreto-de-teste';
  const phoneNumberId = 'phone-123';
  const bytes = Buffer.from('%PDF-1.7\narquivo-valido');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  let fetchMock: jest.Mock;
  let service: MetaWhatsappClientService;

  beforeEach(() => {
    fetchMock = jest.fn();
    const values: Record<string, string> = {
      WHATSAPP_API_VERSION: 'v99.0',
      WHATSAPP_PHONE_NUMBER_ID: phoneNumberId,
      WHATSAPP_ACCESS_TOKEN: token,
      WHATSAPP_MEDIA_MAX_SIZE_BYTES: '1024',
      WHATSAPP_HTTP_TIMEOUT_MS: '1000',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    service = new MetaWhatsappClientService(config, fetchMock);
  });

  it('baixa metadata e bytes validando MIME, tamanho, hash e phone_number_id', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'media-1',
            url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/1',
            mime_type: 'application/pdf',
            file_size: bytes.length,
            sha256,
            messaging_product: 'whatsapp',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(bytes, {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
      );

    const result = await service.downloadMedia('media-1', phoneNumberId);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://graph.facebook.com/v99.0/media-1?phone_number_id=phone-123',
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${token}`,
    );
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    expect(fetchMock.mock.calls[1][1].redirect).toBe('error');
    expect(fetchMock.mock.calls[1][0]).toContain('https://');
    expect(result).toEqual({
      buffer: bytes,
      mimeType: 'application/pdf',
      size: bytes.length,
      sha256,
    });
  });

  it('rejeita phone_number_id do webhook diferente do configurado sem chamar a Meta', async () => {
    await expect(
      service.downloadMedia('media-1', 'outro-phone-id'),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aceita sha256 fornecido pela Meta em Base64', async () => {
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const pngSha256 = createHash('sha256').update(pngBytes).digest('hex');
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'media-1',
            url: 'https://lookaside.fbsbx.com/arquivo',
            mime_type: 'image/png',
            file_size: pngBytes.length,
            sha256: Buffer.from(pngSha256, 'hex').toString('base64'),
            messaging_product: 'whatsapp',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(pngBytes, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );

    await expect(
      service.downloadMedia('media-1', phoneNumberId),
    ).resolves.toEqual(expect.objectContaining({ sha256: pngSha256 }));
  });

  it('interrompe o stream quando o corpo ultrapassa o limite sem content-length', async () => {
    const cancel = jest.fn();
    const read = jest
      .fn()
      .mockResolvedValueOnce({ value: new Uint8Array(700), done: false })
      .mockResolvedValueOnce({ value: new Uint8Array(700), done: false });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'media-1',
            url: 'https://lookaside.fbsbx.com/arquivo',
            mime_type: 'application/pdf',
            file_size: 1000,
            messaging_product: 'whatsapp',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        body: { getReader: () => ({ read, cancel }) },
      });

    await expect(
      service.downloadMedia('media-1', phoneNumberId),
    ).rejects.toThrow('tamanho maximo');
    expect(cancel).toHaveBeenCalled();
  });

  it('rejeita bytes que nao correspondem ao MIME declarado', async () => {
    const invalidPdf = Buffer.from('nao-e-pdf');
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'media-1',
            url: 'https://lookaside.fbsbx.com/arquivo',
            mime_type: 'application/pdf',
            file_size: invalidPdf.length,
            sha256: createHash('sha256').update(invalidPdf).digest('hex'),
            messaging_product: 'whatsapp',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(invalidPdf, {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
      );

    await expect(
      service.downloadMedia('media-1', phoneNumberId),
    ).rejects.toThrow('conteudo');
  });

  it.each([
    [{ mime_type: 'text/plain', file_size: 10 }, 'MIME'],
    [{ mime_type: 'image/jpeg', file_size: 2048 }, 'tamanho'],
    [
      {
        mime_type: 'image/jpeg',
        file_size: 10,
        url: 'http://lookaside.fbsbx.com/a',
      },
      'HTTPS',
    ],
    [
      { mime_type: 'image/jpeg', file_size: 10, url: 'https://example.com/a' },
      'Host',
    ],
  ])('rejeita metadata invalida: %s', async (metadata, mensagem) => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'media-1',
          url: 'https://lookaside.fbsbx.com/a',
          messaging_product: 'whatsapp',
          ...metadata,
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.downloadMedia('media-1', phoneNumberId),
    ).rejects.toThrow(mensagem);
  });

  it('rejeita hash divergente e nao inclui URL ou token no erro', async () => {
    const temporaryUrl = 'https://lookaside.fbsbx.com/url-temporaria-secreta';
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'media-1',
            url: temporaryUrl,
            mime_type: 'image/jpeg',
            file_size: bytes.length,
            sha256: '0'.repeat(64),
            messaging_product: 'whatsapp',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(bytes, {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
      );

    const error = await service
      .downloadMedia('media-1', phoneNumberId)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).not.toContain(temporaryUrl);
    expect(error.message).not.toContain(token);
  });

  it('trata falha HTTP como erro transitorio sanitizado', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('token invalido', { status: 503 }),
    );

    const error = await service
      .downloadMedia('media-1', phoneNumberId)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toContain('token invalido');
    expect(error.message).not.toContain(token);
  });
});
