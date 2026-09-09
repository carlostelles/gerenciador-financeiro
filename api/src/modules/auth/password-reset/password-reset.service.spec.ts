import { PasswordResetService } from './password-reset.service';
import { PasswordReset } from './password-reset.entity';
import {
  digestToken,
  INVALID_RESET,
  RESET_MESSAGE,
} from './password-reset.rules';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import * as bcrypt from 'bcrypt';

describe('Request de recuperação sem rede', () => {
  const setup = () => {
    const builder: any = {};
    for (const name of ['insert', 'into', 'values', 'orUpdate'])
      builder[name] = jest.fn(() => builder);
    builder.execute = jest.fn().mockResolvedValue({});
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        ativo: true,
        email: 'test@example.com',
        credenciaisVersao: 0,
      }),
      findOneOrFail: jest.fn().mockResolvedValue({ admissions: [] }),
      createQueryBuilder: () => builder,
      update: jest.fn(),
      query: jest.fn(),
      create: (_: unknown, value: unknown) => value,
      save: jest.fn(async (_: unknown, value: object) => ({
        ...value,
        id: 10,
      })),
    };
    const db = { transaction: jest.fn(async (fn) => fn(manager)) };
    const mail = {
      assertConfigured: jest.fn(),
      sendReset: jest.fn(() => new Promise(() => {})),
    };
    const store = { assertConfigured: jest.fn(), enqueue: jest.fn() };
    return {
      service: new PasswordResetService(db as any, mail as any, store as any),
      manager,
      mail,
      store,
      db,
    };
  };
  it('serviço real resolve com provedor bloqueado, enfileira na mesma transação e não chama SDK', async () => {
    const { service, mail, store, manager } = setup();
    await expect(service.request(' TEST@example.com ')).resolves.toEqual({
      message: RESET_MESSAGE,
    });
    expect(mail.sendReset).not.toHaveBeenCalled();
    expect(store.enqueue).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id: 10, expiresAt: expect.any(Date) }),
      'test@example.com',
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    );
    expect(manager.save).toHaveBeenCalledWith(PasswordReset, expect.anything());
  });
  it('erro de enqueue aborta callback transacional e retorna 503 sem dados', async () => {
    const { service, store } = setup();
    store.enqueue.mockRejectedValue(new Error('SECRET'));
    await expect(service.request('test@example.com')).rejects.toThrow(
      'Recuperação temporariamente indisponível',
    );
  });
  it('config inválida é uniforme antes da busca/admissão', async () => {
    const { service, store, db } = setup();
    store.assertConfigured.mockImplementation(() => {
      throw new Error('config');
    });
    for (const email of ['test@example.com', 'missing@example.com'])
      await expect(service.request(email)).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('resultado incerto de commit retorna 503 sem repetir admissão/enqueue', async () => {
    const { service, db, manager, store } = setup();
    db.transaction.mockImplementation(async (fn) => {
      await fn(manager);
      throw new Error('commit response lost');
    });
    await expect(service.request('test@example.com')).rejects.toThrow(
      'Recuperação temporariamente indisponível',
    );
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(store.enqueue).toHaveBeenCalledTimes(1);
  });
});

describe('Confirmação: rejeição preliminar e revalidação', () => {
  const now = 1800000000000;
  const dto = {
    token: 'a'.repeat(43),
    novaSenha: 'NovaSenha1!',
    confirmarSenha: 'NovaSenha1!',
  };
  const setup = () => {
    const row = {
      id: 10,
      usuarioId: 1,
      digest: digestToken(dto.token),
      expiresAt: new Date(now + 300000),
      consumedAt: null,
      revokedAt: null,
      credenciaisVersao: 0,
    };
    const lookup = jest.fn().mockResolvedValue({ ...row });
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, ativo: true, credenciaisVersao: 0 })
        .mockResolvedValueOnce(row),
      update: jest.fn(),
      query: jest.fn(),
    };
    const db = {
      getRepository: jest.fn(() => ({ findOneBy: lookup })),
      transaction: jest.fn(async (fn) => fn(manager)),
    };
    const hash = jest
      .spyOn(bcrypt, 'hash')
      .mockImplementation(async () => 'hashed-password');
    return {
      service: new PasswordResetService(db as any, {} as any, {} as any),
      row,
      lookup,
      db,
      manager,
      hash,
    };
  };
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(now));
  afterEach(() => jest.restoreAllMocks());

  it('20 tokens inexistentes retornam a mesma mensagem sem executar bcrypt/transação', async () => {
    const { service, lookup, hash, db } = setup();
    lookup.mockResolvedValue(null);
    for (let i = 0; i < 20; i++) {
      await expect(
        service.confirm({ ...dto, token: `${i}`.padStart(43, 'a') }),
      ).rejects.toThrow(INVALID_RESET);
    }
    expect(lookup).toHaveBeenCalledTimes(20);
    expect(hash).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(['expired', 'consumed', 'revoked'])(
    '%s é rejeitado antes de bcrypt',
    async (state) => {
      const { service, row, lookup, hash, db } = setup();
      lookup.mockResolvedValue({
        ...row,
        ...(state === 'expired'
          ? { expiresAt: new Date(now) }
          : state === 'consumed'
            ? { consumedAt: new Date(now) }
            : { revokedAt: new Date(now) }),
      });
      await expect(service.confirm(dto)).rejects.toThrow(INVALID_RESET);
      expect(hash).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    },
  );
  it('consulta indisponível retorna 503 sanitizado sem bcrypt', async () => {
    const { service, lookup, hash, db } = setup();
    lookup.mockRejectedValue(new Error('private database detail'));
    await expect(service.confirm(dto)).rejects.toThrow(
      'Redefinição temporariamente indisponível',
    );
    expect(hash).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('token válido faz bcrypt fora da transação e relê usuário/digest sob locks na ordem', async () => {
    const { service, hash, lookup, db, manager } = setup();
    hash.mockImplementation(async () => {
      expect(lookup).toHaveBeenCalledWith({ digest: digestToken(dto.token) });
      expect(db.transaction).not.toHaveBeenCalled();
      return 'hashed-password';
    });
    await expect(service.confirm(dto)).resolves.toEqual({
      message: 'Senha redefinida com sucesso. Entre com sua nova senha.',
    });
    expect(hash).toHaveBeenCalledWith(dto.novaSenha, 10);
    expect(manager.findOne).toHaveBeenNthCalledWith(1, Usuario, {
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.findOne).toHaveBeenNthCalledWith(2, PasswordReset, {
      where: { digest: digestToken(dto.token) },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.update).toHaveBeenCalledWith(Usuario, 1, {
      senha: 'hashed-password',
      credenciaisVersao: 1,
    });
  });
});
