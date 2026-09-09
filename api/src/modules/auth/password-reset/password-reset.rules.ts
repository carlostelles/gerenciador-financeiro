import { createHash } from 'crypto';

export const RESET_MESSAGE =
  'Se houver uma conta ativa com este e-mail, enviaremos um link para redefinir sua senha.';
export const INVALID_RESET =
  'Link inválido ou expirado. Solicite uma nova recuperação.';
export const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|?,.:]{8,16}$/;
export const digestToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export function credentialVersionMatches(
  payload: Record<string, unknown>,
  current: number,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(payload, 'credenciaisVersao'))
    return current === 0;
  const version = payload.credenciaisVersao;
  return (
    typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version >= 0 &&
    version === current
  );
}

export function admitEmail(previous: number[], now: number): number[] | null {
  const recent = previous.filter((time) => time > now - 3600000);
  if (recent.length >= 3 || recent.some((time) => now - time < 60000))
    return null;
  return [...recent, now];
}
