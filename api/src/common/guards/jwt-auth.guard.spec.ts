import { JwtAuthGuard } from './jwt-auth.guard';

describe('JWT guard — access header/cookie e credenciais atuais', () => {
  const jwt = { verifyAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const repo = { findOne: jest.fn() };
  const db = { getRepository: () => repo };
  const guard = new JwtAuthGuard(jwt as any, reflector as any, { get: () => 'test' } as any, db as any);
  const context = (cookies = false) => {
    const req = { headers: cookies ? {} : { authorization: 'Bearer old' }, cookies: cookies ? { access_token: 'old' } : {} };
    return { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) } as any;
  };
  beforeEach(() => { jest.clearAllMocks(); reflector.getAllAndOverride.mockReturnValue(false); });
  it.each([false, true])('rejeita sessão revogada por versão (cookie=%s)', async cookies => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1, credenciaisVersao: 0 });
    repo.findOne.mockResolvedValue({ ativo: true, credenciaisVersao: 1 });
    await expect(guard.canActivate(context(cookies))).rejects.toThrow('Token inválido');
  });
  it.each([null, -1, '0', 1.5, true, {}])('rejeita claim inválido %p', async claim => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1, credenciaisVersao: claim });
    repo.findOne.mockResolvedValue({ ativo: true, credenciaisVersao: 0 });
    await expect(guard.canActivate(context())).rejects.toThrow('Token inválido');
  });
  it('legado só versão zero; conta inativa sempre rejeitada', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1 });
    repo.findOne.mockResolvedValue({ ativo: true, credenciaisVersao: 0 });
    await expect(guard.canActivate(context())).resolves.toBe(true);
    repo.findOne.mockResolvedValue({ ativo: true, credenciaisVersao: 1 });
    await expect(guard.canActivate(context())).rejects.toThrow();
    repo.findOne.mockResolvedValue({ ativo: false, credenciaisVersao: 0 });
    await expect(guard.canActivate(context())).rejects.toThrow();
  });
  it('público não exige conta nem JWT', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(repo.findOne).not.toHaveBeenCalled();
  });
});