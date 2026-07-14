import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ComprovanteUploadFile } from '../types/comprovante-upload-file.type';

@Injectable()
export class MovimentoComprovanteStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_S3_REGION');
    const accessKeyId = this.configService.get<string>('AWS_S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_S3_SECRET_ACCESS_KEY');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

    this.client = new S3Client({
      region,
      credentials: accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    });
  }

  async uploadComprovante(
    usuarioId: number,
    arquivo: ComprovanteUploadFile,
  ): Promise<{ bucket: string; key: string; caminhoArquivo: string }> {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'Bucket S3 não configurado para upload de comprovantes',
      );
    }

    const agora = new Date();
    const ano = agora.getUTCFullYear();
    const mes = String(agora.getUTCMonth() + 1).padStart(2, '0');
    const extensao = extname(arquivo.originalname) || '';
    const nomeBase = arquivo.originalname
      .replace(extensao, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'comprovante';

    const key = `movimentacoes/${usuarioId}/${ano}/${mes}/${randomUUID()}-${nomeBase}${extensao}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: arquivo.buffer,
        ContentType: arquivo.mimetype,
      }),
    );

    return {
      bucket: this.bucket,
      key,
      caminhoArquivo: `s3://${this.bucket}/${key}`,
    };
  }
}