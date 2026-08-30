import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export const META_WHATSAPP_FETCH = Symbol('META_WHATSAPP_FETCH');

interface MetaMediaMetadata {
  id?: string;
  url?: string;
  mime_type?: string;
  file_size?: number;
  sha256?: string;
  messaging_product?: string;
}

export interface MetaMediaDownload {
  buffer: Buffer;
  mimeType: string;
  size: number;
  sha256: string;
}

@Injectable()
export class MetaWhatsappClientService {
  private readonly apiVersion: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly maxSizeBytes: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(META_WHATSAPP_FETCH)
    fetchImpl?: typeof fetch,
  ) {
    this.apiVersion =
      this.configService.get<string>('WHATSAPP_API_VERSION') || '';
    this.phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.maxSizeBytes = this.positiveInteger(
      this.configService.get<string>('WHATSAPP_MEDIA_MAX_SIZE_BYTES'),
      10 * 1024 * 1024,
    );
    this.timeoutMs = this.positiveInteger(
      this.configService.get<string>('WHATSAPP_HTTP_TIMEOUT_MS'),
      15_000,
    );
    this.fetchImpl = fetchImpl || globalThis.fetch;
  }

  async downloadMedia(
    mediaId: string,
    payloadPhoneNumberId: string,
  ): Promise<MetaMediaDownload> {
    this.validateConfiguration();

    if (!mediaId?.trim()) {
      throw new BadRequestException('Identificador da midia ausente');
    }
    this.validateWebhookPhoneNumberId(payloadPhoneNumberId);

    const metadataUrl = new URL(
      `${this.apiVersion}/${encodeURIComponent(mediaId)}`,
      'https://graph.facebook.com/',
    );
    metadataUrl.searchParams.set('phone_number_id', this.phoneNumberId);

    const metadataResponse = await this.request(metadataUrl.toString());
    const metadata = (await metadataResponse
      .json()
      .catch(() => null)) as MetaMediaMetadata | null;
    this.validateMetadata(metadata, mediaId);

    const mediaResponse = await this.request(metadata.url!);
    const responseMime = mediaResponse.headers
      .get('content-type')
      ?.split(';')[0];
    if (responseMime && responseMime !== metadata.mime_type) {
      throw new BadRequestException('MIME da midia diverge dos metadados');
    }
    const contentLength = Number(mediaResponse.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > this.maxSizeBytes) {
      throw new BadRequestException('Midia excede o tamanho maximo permitido');
    }

    const buffer = await this.readLimitedBody(mediaResponse);
    if (buffer.length !== metadata.file_size) {
      throw new BadRequestException('Tamanho da midia diverge dos metadados');
    }
    if (!this.matchesMagicBytes(buffer, metadata.mime_type!)) {
      throw new BadRequestException(
        'MIME da midia diverge do conteudo do arquivo',
      );
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex');
    if (
      metadata.sha256 &&
      !this.hashMatches(metadata.sha256, Buffer.from(sha256, 'hex'))
    ) {
      throw new BadRequestException('Hash da midia diverge dos metadados');
    }

    return {
      buffer,
      mimeType: metadata.mime_type!,
      size: buffer.length,
      sha256,
    };
  }

  validateWebhookPhoneNumberId(payloadPhoneNumberId: string): void {
    this.validateConfiguration();
    if (payloadPhoneNumberId !== this.phoneNumberId) {
      throw new BadRequestException(
        'phone_number_id do webhook nao corresponde ao configurado',
      );
    }
  }

  private async request(url: string): Promise<Response> {
    try {
      const response = await this.fetchImpl(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Meta Cloud API indisponivel (HTTP ${response.status})`,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Falha transitoria na Meta Cloud API',
      );
    }
  }

  private validateMetadata(
    metadata: MetaMediaMetadata | null,
    mediaId: string,
  ): asserts metadata is Required<
    Pick<MetaMediaMetadata, 'url' | 'mime_type' | 'file_size'>
  > &
    MetaMediaMetadata {
    if (
      !metadata ||
      metadata.messaging_product !== 'whatsapp' ||
      (metadata.id && metadata.id !== mediaId)
    ) {
      throw new BadRequestException('Metadados da midia invalidos');
    }
    if (!this.isAllowedMime(metadata.mime_type)) {
      throw new BadRequestException('MIME da midia nao permitido');
    }
    if (
      !Number.isInteger(metadata.file_size) ||
      metadata.file_size! < 0 ||
      metadata.file_size! > this.maxSizeBytes
    ) {
      throw new BadRequestException('Midia excede o tamanho maximo permitido');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(metadata.url || '');
    } catch {
      throw new BadRequestException('URL HTTPS da midia invalida');
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('URL HTTPS da midia invalida');
    }
    const allowedHosts = ['facebook.com', 'fbcdn.net', 'fbsbx.com'];
    if (
      !allowedHosts.some(
        (host) =>
          parsedUrl.hostname === host ||
          parsedUrl.hostname.endsWith(`.${host}`),
      )
    ) {
      throw new BadRequestException('Host da URL de midia nao permitido');
    }
    if (
      metadata.sha256 &&
      !/^[a-f0-9]{64}$/i.test(metadata.sha256) &&
      !this.isSha256Base64(metadata.sha256)
    ) {
      throw new BadRequestException('Hash da midia invalido');
    }
  }

  private hashMatches(received: string, calculated: Buffer): boolean {
    const receivedBuffer = /^[a-f0-9]{64}$/i.test(received)
      ? Buffer.from(received, 'hex')
      : Buffer.from(received, 'base64');
    return receivedBuffer.length === 32 && receivedBuffer.equals(calculated);
  }

  private isSha256Base64(value: string): boolean {
    return (
      /^[A-Za-z0-9+/]{43}=$/.test(value) &&
      Buffer.from(value, 'base64').length === 32
    );
  }

  private async readLimitedBody(response: Response): Promise<Buffer> {
    if (!response.body) {
      throw new BadRequestException('Corpo da midia ausente');
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > this.maxSizeBytes) {
        await reader.cancel();
        throw new BadRequestException(
          'Midia excede o tamanho maximo permitido',
        );
      }
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks, total);
  }

  private matchesMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'application/pdf') {
      return buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));
    }
    if (mimeType === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (mimeType === 'image/png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/webp') {
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      const brand = buffer.subarray(8, 12).toString('ascii');
      return (
        buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
        ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)
      );
    }
    return false;
  }

  private isAllowedMime(mimeType?: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ].includes(mimeType || '')
    );
  }

  private validateConfiguration(): void {
    if (!this.apiVersion || !this.phoneNumberId || !this.accessToken) {
      throw new InternalServerErrorException(
        'Integracao WhatsApp Cloud API nao configurada',
      );
    }
    if (!/^v\d+\.\d+$/.test(this.apiVersion)) {
      throw new InternalServerErrorException(
        'WHATSAPP_API_VERSION possui formato invalido',
      );
    }
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
