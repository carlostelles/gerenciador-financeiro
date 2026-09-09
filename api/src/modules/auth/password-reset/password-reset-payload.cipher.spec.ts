import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  PasswordResetPayloadCipher,
  PayloadError,
} from './password-reset-payload.cipher';
import { digestToken } from './password-reset.rules';

describe('Envelope de recuperação (crypto real)', () => {
  const key = randomBytes(32).toString('base64');
  const next = randomBytes(32).toString('base64');
  const config = (
    active = 'one',
    keys = { one: key } as Record<string, string>,
  ) =>
    new ConfigService({
      PASSWORD_RESET_ACTIVE_KEY_ID: active,
      PASSWORD_RESET_KEYRING: JSON.stringify(keys),
    });
  const token = randomBytes(32).toString('base64url');
  const context = {
    id: 'job-a',
    recuperacaoId: 1,
    usuarioId: 7,
    digest: digestToken(token),
    issuedAt: new Date(1800000000000),
    expiresAt: new Date(1800000300000),
    credenciaisVersao: 2,
  };
  it('cifra com nonce aleatório, autentica contexto e confere digest', () => {
    const cipher = new PasswordResetPayloadCipher(config());
    const a = cipher.seal(context, { token, email: 'test@example.com' });
    const b = cipher.seal(context, { token, email: 'test@example.com' });
    expect(a.nonce).toHaveLength(12);
    expect(a.authTag).toHaveLength(16);
    expect(a.nonce.equals(b.nonce)).toBe(false);
    expect(JSON.stringify(a)).not.toContain(token);
    expect(a.ciphertext.toString('utf8')).not.toContain(token);
    expect(a.ciphertext.toString()).not.toContain('test@example.com');
    expect(cipher.open(context, a)).toEqual({
      token,
      email: 'test@example.com',
    });
    expect(() =>
      cipher.open({ ...context, digest: 'a'.repeat(64) }, a),
    ).toThrow(PayloadError);
    const wrong = cipher.seal(context, {
      token: randomBytes(32).toString('base64url'),
      email: 'test@example.com',
    });
    expect(() => cipher.open(context, wrong)).toThrow(PayloadError);
  });
  it.each(['nonce', 'authTag', 'ciphertext'])(
    'adulteração de %s falha fechada',
    (field) => {
      const cipher = new PasswordResetPayloadCipher(config());
      const envelope = cipher.seal(context, {
        token,
        email: 'test@example.com',
      });
      envelope[field][0] ^= 1;
      expect(() => cipher.open(context, envelope)).toThrow('payload_invalid');
    },
  );
  it.each([
    'id',
    'recuperacaoId',
    'usuarioId',
    'issuedAt',
    'expiresAt',
    'credenciaisVersao',
  ])('AAD vincula %s', (field) => {
    const cipher = new PasswordResetPayloadCipher(config());
    const envelope = cipher.seal(context, { token, email: 'test@example.com' });
    const changed = {
      ...context,
      [field]: field.endsWith('At')
        ? new Date(0)
        : field === 'id'
          ? 'job-b'
          : 99,
    };
    expect(() => cipher.open(changed, envelope)).toThrow(PayloadError);
  });
  it('rotação lê chave antiga, escreve nova; desconhecida é distinguida sem vazar dados', () => {
    const old = new PasswordResetPayloadCipher(config()).seal(context, {
      token,
      email: 'test@example.com',
    });
    const rotated = new PasswordResetPayloadCipher(
      config('two', { one: key, two: next }),
    );
    expect(rotated.open(context, old).token).toBe(token);
    expect(
      rotated.seal(context, { token, email: 'test@example.com' }).keyId,
    ).toBe('two');
    expect(() =>
      new PasswordResetPayloadCipher(config('two', { two: next })).open(
        context,
        old,
      ),
    ).toThrow('key_unavailable');
  });
  it.each([
    {},
    { PASSWORD_RESET_ACTIVE_KEY_ID: 'one', PASSWORD_RESET_KEYRING: '{}' },
    { PASSWORD_RESET_ACTIVE_KEY_ID: 'one', PASSWORD_RESET_KEYRING: '{bad' },
    {
      PASSWORD_RESET_ACTIVE_KEY_ID: 'one',
      PASSWORD_RESET_KEYRING: '{"one":"short"}',
    },
  ])('config inválida é 503 sanitizado', (values) => {
    expect(() =>
      new PasswordResetPayloadCipher(
        new ConfigService(values),
      ).assertConfigured(),
    ).toThrow('Recuperação temporariamente indisponível');
  });
});
