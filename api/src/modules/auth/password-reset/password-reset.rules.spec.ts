import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RedefinirSenhaDto } from './password-reset.dto';
import { credentialVersionMatches, admitEmail, digestToken } from './password-reset.rules';

describe('regras de recuperação', () => {
  it.each(['abcdefgh', '12345678', '!@#$%^&*', 'a'.repeat(16)])('preserva senha permitida %s', async senha => {
    expect(await validate(plainToInstance(RedefinirSenhaDto, { token: 'a'.repeat(43), novaSenha: senha, confirmarSenha: senha }))).toEqual([]);
  });
  it.each(['a'.repeat(7), 'a'.repeat(17), ' abcdefgh', 'abcdefgh ', 'ábcdefgh', 'abcdefg/', 'abcdefgh\n', 'abcdefgh\r', 'abcdefgh\u2028'])('rejeita senha sem trim %s', async senha => {
    expect((await validate(plainToInstance(RedefinirSenhaDto, { token: 'a'.repeat(43), novaSenha: senha, confirmarSenha: senha }))).length).toBeGreaterThan(0);
  });
  it.each([null, -1, 0.5, '0', {}, true, NaN])('rejeita claim inválido %p', claim => {
    expect(credentialVersionMatches({ credenciaisVersao: claim }, 0)).toBe(false);
  });
  it('aceita legado somente na versão zero e exige igualdade', () => {
    expect(credentialVersionMatches({}, 0)).toBe(true);
    expect(credentialVersionMatches({}, 1)).toBe(false);
    expect(credentialVersionMatches({ credenciaisVersao: 2 }, 2)).toBe(true);
    expect(credentialVersionMatches({ credenciaisVersao: 1 }, 2)).toBe(false);
    expect(credentialVersionMatches({ credenciaisVersao: undefined }, 0)).toBe(false);
  });
  it('cooldown exato e janela móvel de três admissões', () => {
    expect(admitEmail([0], 59999)).toBeNull();
    expect(admitEmail([0], 60000)).toEqual([0, 60000]);
    expect(admitEmail([0, 60000, 120000], 3599999)).toBeNull();
    expect(admitEmail([0, 60000, 120000], 3600000)).toEqual([60000, 120000, 3600000]);
  });
  it('limite móvel não reinicia na virada de uma hora do relógio', () => {
    expect(admitEmail([3500000, 3560000, 3620000], 3680000)).toBeNull();
  });
  it('digest SHA-256 nunca é o token bruto', () => {
    expect(digestToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});