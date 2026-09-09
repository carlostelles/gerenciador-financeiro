import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { digestToken } from './password-reset.rules';

export interface PayloadContext {
  id: string;
  recuperacaoId: number;
  usuarioId: number;
  digest: string;
  issuedAt: Date;
  expiresAt: Date;
  credenciaisVersao: number;
}
export interface PayloadEnvelope {
  payloadVersion: number;
  keyId: string;
  nonce: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}
export class PayloadError extends Error {
  constructor(readonly code: 'key_unavailable' | 'payload_invalid') {
    super(code);
  }
}

@Injectable()
export class PasswordResetPayloadCipher {
  constructor(private readonly config: ConfigService) {}

  private keys(): { active: string; ring: Map<string, Buffer> } {
    const active =
      this.config.get<string>('PASSWORD_RESET_ACTIVE_KEY_ID') || '';
    const parsed: unknown = JSON.parse(
      this.config.get<string>('PASSWORD_RESET_KEYRING') || '',
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error();
    const ring = new Map<string, Buffer>();
    for (const [id, encoded] of Object.entries(parsed)) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || typeof encoded !== 'string')
        throw new Error();
      const key = Buffer.from(encoded, 'base64');
      if (key.length !== 32 || key.toString('base64') !== encoded)
        throw new Error();
      // A backend-exclusive key must not alias any existing application credential.
      for (const name of [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'HOSTINGER_MAIL_API_TOKEN',
        'DB_PASSWORD',
      ]) {
        const secret = this.config.get<string>(name);
        if (secret && (secret === encoded || key.equals(Buffer.from(secret))))
          throw new Error();
      }
      ring.set(id, key);
    }
    if (!ring.has(active)) throw new Error();
    return { active, ring };
  }

  assertConfigured(): void {
    try {
      this.keys();
    } catch {
      throw new ServiceUnavailableException(
        'Recuperação temporariamente indisponível',
      );
    }
  }

  private aad(context: PayloadContext, keyId: string): Buffer {
    return Buffer.from(
      JSON.stringify([
        'password-reset-delivery',
        1,
        keyId,
        context.id,
        context.recuperacaoId,
        context.usuarioId,
        context.digest,
        context.issuedAt.toISOString(),
        context.expiresAt.toISOString(),
        context.credenciaisVersao,
      ]),
    );
  }

  seal(
    context: PayloadContext,
    payload: { token: string; email: string },
  ): PayloadEnvelope {
    const { active, ring } = this.keys();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', ring.get(active)!, nonce);
    cipher.setAAD(this.aad(context, active));
    const clear = Buffer.from(JSON.stringify(payload));
    try {
      const ciphertext = Buffer.concat([cipher.update(clear), cipher.final()]);
      return {
        payloadVersion: 1,
        keyId: active,
        nonce,
        authTag: cipher.getAuthTag(),
        ciphertext,
      };
    } finally {
      clear.fill(0);
    }
  }

  open(
    context: PayloadContext,
    envelope: PayloadEnvelope,
  ): { token: string; email: string } {
    let key: Buffer | undefined;
    try {
      key = this.keys().ring.get(envelope.keyId);
    } catch {
      throw new PayloadError('key_unavailable');
    }
    if (!key) throw new PayloadError('key_unavailable');
    let clear: Buffer | undefined;
    try {
      if (
        envelope.payloadVersion !== 1 ||
        envelope.nonce?.length !== 12 ||
        envelope.authTag?.length !== 16 ||
        !envelope.ciphertext?.length ||
        envelope.ciphertext.length > 4096
      )
        throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', key, envelope.nonce);
      decipher.setAAD(this.aad(context, envelope.keyId));
      decipher.setAuthTag(envelope.authTag);
      clear = Buffer.concat([
        decipher.update(envelope.ciphertext),
        decipher.final(),
      ]);
      const payload = JSON.parse(clear.toString('utf8'));
      if (
        typeof payload?.token !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(payload.token) ||
        typeof payload.email !== 'string' ||
        payload.email.length > 255 ||
        !/^[^\s@]+@[^\s@]+$/.test(payload.email) ||
        !timingSafeEqual(
          Buffer.from(digestToken(payload.token), 'hex'),
          Buffer.from(context.digest, 'hex'),
        )
      )
        throw new Error();
      return { token: payload.token, email: payload.email };
    } catch {
      throw new PayloadError('payload_invalid');
    } finally {
      clear?.fill(0);
    }
  }
}
