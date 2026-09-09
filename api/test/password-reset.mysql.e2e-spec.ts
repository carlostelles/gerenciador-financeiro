import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DatabaseConfig } from '../src/config/database.config';
import { PasswordRecovery1798844400000 } from '../src/migrations/1798844400000-PasswordRecovery';
import { PasswordResetService } from '../src/modules/auth/password-reset/password-reset.service';
import { PasswordReset, PasswordResetLimit } from '../src/modules/auth/password-reset/password-reset.entity';
import { digestToken, RESET_MESSAGE } from '../src/modules/auth/password-reset/password-reset.rules';
import { Usuario } from '../src/modules/usuarios/entities/usuario.entity';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { randomBytes, randomUUID } from 'crypto';
import { PasswordResetDelivery1798930800000 } from '../src/migrations/1798930800000-PasswordResetDelivery';
import { PasswordResetPayloadCipher } from '../src/modules/auth/password-reset/password-reset-payload.cipher';
import { PasswordResetDeliveryStore } from '../src/modules/auth/password-reset/password-reset-delivery.store';
import { PasswordResetDeliveryWorker } from '../src/modules/auth/password-reset/password-reset-delivery.worker';
import { PasswordResetDelivery as Job, DeliveryStatus as State } from '../src/modules/auth/password-reset/password-reset-delivery.entity';
import { MailDeliveryError } from '../src/modules/auth/password-reset/hostinger-mail.service';
import { Logger } from '@nestjs/common';

// Opt-in ONLY: fixed loopback, disposable database/credentials, never .env.
const mysql = process.env.PASSWORD_RESET_MYSQL_TEST === '1' ? describe : describe.skip;
mysql('Recuperação MySQL real isolado', () => {
  let db: DataSource;
  let service: PasswordResetService;
  let users: UsuariosService;
  let mail: { assertConfigured: jest.Mock; sendReset: jest.Mock };
  let clock: jest.SpyInstance;
  let now: number;
  let cipher: PasswordResetPayloadCipher;
  let seal: jest.SpyInstance;
  let store: PasswordResetDeliveryStore;
  let config: ConfigService;
  const testKey = randomBytes(32).toString('base64');
  const email = 'reset@example.com';
  const dto = (token: string) => ({ token, novaSenha: 'NovaSenha1!', confirmarSenha: 'NovaSenha1!' });
  // Capture only in test memory at encryption boundary; do not dispatch to inspect a link.
  const token = () => seal.mock.calls[seal.mock.calls.length - 1][1].token as string;
  const migration = new PasswordRecovery1798844400000();
  const queueMigration = new PasswordResetDelivery1798930800000();

  beforeAll(async () => {
    const options = new DatabaseConfig(new ConfigService()).createTypeOrmOptions();
    db = await new DataSource({ ...options, type: 'mysql', host: '127.0.0.1', port: 13367, username: 'root', password: 'disposable-test-only', database: 'password_reset_test', logging: false, synchronize: false, migrations: [], timezone: 'Z' } as DataSourceOptions).initialize();
    // Only this fixed disposable schema may be reset between executions.
    await db.query('DROP TABLE IF EXISTS recuperacao_envios');
    await db.query('DROP TABLE IF EXISTS recuperacoes_senha');
    await db.query('DROP TABLE IF EXISTS recuperacao_limites');
    await db.query('DROP TABLE IF EXISTS usuarios');
    await db.query('CREATE TABLE usuarios (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, nome varchar(255) NOT NULL, email varchar(255) UNIQUE NOT NULL, senha varchar(255) NOT NULL, telefone varchar(20) UNIQUE NOT NULL, role varchar(20) NOT NULL DEFAULT "USER", ativo tinyint NOT NULL DEFAULT 1, createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    const runner = db.createQueryRunner();
    try { await migration.up(runner); await migration.down(runner); await migration.up(runner); await queueMigration.up(runner); await queueMigration.down(runner); await queueMigration.up(runner); } finally { await runner.release(); }
  }, 30000);
  beforeEach(async () => {
    await db.query('DELETE FROM recuperacoes_senha');
    await db.query('DELETE FROM recuperacao_limites');
    await db.query('DELETE FROM usuarios');
    await db.query('INSERT INTO usuarios (id,nome,email,senha,telefone) VALUES (1,?,?,?,?)', ['Reset', email, await bcrypt.hash('OldPass1!', 10), '11900000000']);
    mail = { assertConfigured: jest.fn(), sendReset: jest.fn().mockResolvedValue(undefined) };
    config = new ConfigService({ PASSWORD_RESET_DELIVERY_ENABLED: 'true', PASSWORD_RESET_ACTIVE_KEY_ID: 'test', PASSWORD_RESET_KEYRING: JSON.stringify({ test: testKey }) });
    cipher = new PasswordResetPayloadCipher(config);
    seal = jest.spyOn(cipher, 'seal');
    store = new PasswordResetDeliveryStore(db, cipher);
    service = new PasswordResetService(db, mail as any, store);
    users = new UsuariosService(db.getRepository(Usuario), { create: jest.fn() } as any, {} as any);
    now = new Date((await db.query('SELECT UTC_TIMESTAMP(3) AS now'))[0].now).getTime();
    clock = jest.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });

  // Hold the first INSERT after execution. The second either completes too (old
  // shared locks) or waits for the first in InnoDB (exclusive acquisition).
  // Observe actual lock waits, not elapsed sleeps or a barrier that would hang
  // once the correct exclusive lock prevents the second INSERT from completing.
  const concurrentBucketRequests = async (targets: [string, string]) => {
    const runners = [db.createQueryRunner(), db.createQueryRunner()];
    const ids: number[] = [];
    const errors: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let firstInserted = false;
    let secondInserted = false;
    const pending: Promise<unknown>[] = [];
    const waitFor = async (condition: () => Promise<boolean>) => {
      const deadline = performance.now() + 5000;
      while (!(await condition())) {
        if (performance.now() >= deadline) throw new Error('Intercalação MySQL não observada');
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    };
    try {
      for (const [index, runner] of runners.entries()) {
        await runner.connect();
        ids.push(Number((await runner.query('SELECT CONNECTION_ID() AS id'))[0].id));
        const query = runner.query.bind(runner);
        jest.spyOn(runner, 'query').mockImplementation(async (...args: Parameters<typeof runner.query>) => {
          try {
            const result = await query(...args);
            if (/^INSERT\s+(?:IGNORE\s+)?INTO\s+`?recuperacao_limites`?/i.test(args[0])) {
              if (index === 0) firstInserted = true;
              else secondInserted = true;
              await gate;
            }
            return result;
          } catch (error) {
            errors.push(error.driverError?.code ?? error.code);
            throw error;
          }
        });
      }
      expect(new Set(ids).size).toBe(2);
      jest.spyOn(db, 'createQueryRunner').mockReturnValueOnce(runners[0]).mockReturnValueOnce(runners[1]);
      // Attach rejection handlers immediately, including while barriers are held.
      pending.push(service.request(targets[0]));
      void Promise.allSettled(pending);
      await waitFor(async () => firstInserted);
      pending.push(service.request(targets[1]));
      const results = Promise.allSettled(pending);
      // Observe the requesting connection and the actual table lock. An implicit
      // insert lock's BLOCKING_THREAD_ID can name the thread materializing it;
      // innodb_trx snapshots can also lag behind reused pooled connections.
      await waitFor(async () => secondInserted || (await db.query(`
        SELECT 1 FROM performance_schema.data_lock_waits w
        JOIN performance_schema.threads r ON r.THREAD_ID = w.REQUESTING_THREAD_ID
        JOIN performance_schema.data_locks l ON l.ENGINE = w.ENGINE AND l.ENGINE_LOCK_ID = w.REQUESTING_ENGINE_LOCK_ID
        WHERE r.PROCESSLIST_ID = ? AND l.OBJECT_SCHEMA = 'password_reset_test'
          AND l.OBJECT_NAME = 'recuperacao_limites'`, [ids[1]])).length > 0);
      release();
      const settled = await results;
      expect(errors).toEqual([]);
      expect(settled).toEqual(targets.map(() => ({ status: 'fulfilled', value: { message: RESET_MESSAGE } })));
    } finally {
      release();
      await Promise.allSettled(pending);
      for (const runner of runners) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        if (!runner.isReleased) await runner.release();
      }
    }
  };

  it.each(['missing', 'cooldown', 'eligible', 'quota', 'absent', 'signup'])('B1 locks concorrentes determinísticos: %s preserva bucket/link/job', async scenario => {
    const target = scenario === 'missing' || scenario === 'signup' ? 'signup@example.com' : email;
    if (scenario !== 'absent') await service.request(target);
    if (scenario === 'eligible') clock.mockReturnValue(now + 60000);
    if (scenario === 'quota') {
      clock.mockReturnValue(now + 60000); await service.request(target);
      clock.mockReturnValue(now + 120000); await service.request(target);
      clock.mockReturnValue(now + 180000);
    }
    if (scenario === 'signup') {
      const signup = new UsuariosService(db.getRepository(Usuario), { create: jest.fn() } as any, { create: jest.fn() } as any);
      await signup.create({ nome: 'Signup', email: target, senha: 'OldPass1!', telefone: '11900000001' });
    }
    const beforeRows = await db.getRepository(PasswordReset).find();
    const beforeJobs = await db.getRepository(Job).find();
    // Accented spelling must resolve to the same existing-account bucket.
    const variant = scenario === 'missing' ? target : target.replace('s', 'ś');
    await concurrentBucketRequests([target, variant]);
    const expected = scenario === 'eligible' ? [now, now + 60000] : scenario === 'quota' ? [now, now + 60000, now + 120000] : [now];
    expect(await db.getRepository(PasswordResetLimit).find()).toEqual([{ emailDigest: digestToken(target), admissions: expected }]);
    if (['missing', 'cooldown', 'quota', 'signup'].includes(scenario)) {
      expect(await db.getRepository(PasswordReset).find()).toEqual(beforeRows);
      expect(await db.getRepository(Job).find()).toEqual(beforeJobs);
    } else {
      expect(await db.getRepository(PasswordReset).countBy({ consumedAt: IsNull(), revokedAt: IsNull() })).toBe(1);
      expect(await db.getRepository(Job).countBy({ status: State.PENDING })).toBe(1);
    }
    expect(mail.sendReset).not.toHaveBeenCalled();
  }, 15000);

  it.each(['expired', 'consumed', 'revoked', 'version', 'inactive', 'deleted'])('D1 revalida %s ocorrido durante bcrypt real antes dos locks', async state => {
    await service.request(email); const raw = token();
    const originalUser = await db.getRepository(Usuario).findOneByOrFail({ id: 1 });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let started!: () => void;
    const hashing = new Promise<void>(resolve => { started = resolve; });
    const realHash = bcrypt.hash;
    jest.spyOn(bcrypt, 'hash').mockImplementation(async (password: string, rounds: number) => {
      const value = await realHash(password, rounds);
      started(); await gate; return value;
    });
    const confirmation = service.confirm(dto(raw));
    const result = Promise.allSettled([confirmation]);
    try {
      await hashing;
      // A separate connection commits invalidation while confirm holds no locks.
      await db.transaction(async manager => {
        if (state === 'expired') clock.mockReturnValue(now + 300000);
        else if (state === 'version') await manager.update(Usuario, 1, { credenciaisVersao: 1 });
        else if (state === 'inactive') await manager.update(Usuario, 1, { ativo: false });
        else if (state === 'deleted') await manager.delete(PasswordReset, { digest: digestToken(raw) });
        else await manager.update(PasswordReset, { digest: digestToken(raw) }, { [state === 'consumed' ? 'consumedAt' : 'revokedAt']: new Date(now) });
      });
      release();
      await expect(confirmation).rejects.toThrow('Link inválido');
      const user = await db.getRepository(Usuario).findOneByOrFail({ id: 1 });
      expect(user.senha).toBe(originalUser.senha);
      expect(user.credenciaisVersao).toBe(state === 'version' ? 1 : 0);
      const reset = await db.getRepository(PasswordReset).findOneBy({ digest: digestToken(raw) });
      if (reset && state !== 'consumed') expect(reset.consumedAt).toBeNull();
    } finally { release(); await result; }
  });

  it('persiste digest, expira 300s, consome uma vez e incrementa versão', async () => {
    expect(await service.request(email)).toEqual({ message: RESET_MESSAGE });
    const raw = token();
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await db.getRepository(PasswordReset).findOneByOrFail({ digest: digestToken(raw) });
    expect(row.expiresAt.getTime() - row.issuedAt.getTime()).toBe(300000);
    expect(JSON.stringify(row)).not.toContain(raw);
    await service.confirm(dto(raw));
    const user = await db.getRepository(Usuario).findOneByOrFail({ id: 1 });
    expect(await bcrypt.compare('NovaSenha1!', user.senha)).toBe(true);
    expect(user.credenciaisVersao).toBe(1);
    await expect(service.confirm(dto(raw))).rejects.toThrow('Link inválido');
  });
  it.each([299999, 300000, 300001])('expiração exata %ims', async elapsed => {
    await service.request(email); const raw = token(); clock.mockReturnValue(now + elapsed);
    if (elapsed < 300000) await expect(service.confirm(dto(raw))).resolves.toEqual({ message: 'Senha redefinida com sucesso. Entre com sua nova senha.' });
    else await expect(service.confirm(dto(raw))).rejects.toThrow('Link inválido');
  });
  it('confirmações concorrentes têm exatamente um vencedor', async () => {
    await service.request(email); const raw = token();
    const result = await Promise.allSettled([service.confirm(dto(raw)), service.confirm(dto(raw))]);
    expect(result.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect((await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).credenciaisVersao).toBe(1);
  });

  it('reset e alteração legada concorrentes serializam a mesma versão validada', async () => {
    await service.request(email); const raw = token();
    const results = await Promise.allSettled([service.confirm(dto(raw)), users.updatePassword(1, 'LegacyPass1!', 0)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).credenciaisVersao).toBe(1);
  });

  it('reset e reenvio concorrentes mantêm o novo link consistente com versão atual', async () => {
    await service.request(email); const old = token(); clock.mockReturnValue(now + 60000);
    const results = await Promise.allSettled([service.confirm(dto(old)), service.request(email)]);
    expect(results[1].status).toBe('fulfilled');
    expect(seal).toHaveBeenCalledTimes(2);
    await service.confirm(dto(token()));
    await expect(service.confirm(dto(old))).rejects.toThrow('Link inválido');
  });
  it('reenvios concorrentes admitem apenas um; supressão não revoga atual', async () => {
    await Promise.all([service.request(email), service.request(email)]);
    expect(seal).toHaveBeenCalledTimes(1);
    await service.confirm(dto(token()));
  });

  it('variações equivalentes na collation MySQL não contornam cooldown', async () => {
    await service.request(email);
    await service.request('resét@example.com');
    expect(seal).toHaveBeenCalledTimes(1);
  });
  it('último link apenas e limite persistente entre instâncias', async () => {
    await service.request(email); const old = token();
    clock.mockReturnValue(now + 60000); await service.request(email);
    await expect(service.confirm(dto(old))).rejects.toThrow('Link inválido');
    clock.mockReturnValue(now + 120000); await service.request(email);
    clock.mockReturnValue(now + 180000); await new PasswordResetService(db, mail as any, store).request(email);
    expect(seal).toHaveBeenCalledTimes(3);
    await service.confirm(dto(token()));
  });

  it('limite sobrevive a conexões independentes/reinicializadas', async () => {
    await service.request('missing@example.com');
    const other = new DataSource(db.options);
    try {
      await other.initialize();
      const second = new PasswordResetService(other, mail as any, new PasswordResetDeliveryStore(other, cipher));
      await second.request('missing@example.com');
      await other.destroy(); await other.initialize();
      await second.request('missing@example.com');
      expect((await other.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digestToken('missing@example.com') })).admissions).toEqual([now]);
    } finally { if (other.isInitialized) await other.destroy(); }
  });

  it('JWT/bcrypt/MySQL reais: revoga access, cookie, refresh e legados; login manual funciona', async () => {
    const jwt = new JwtService();
    const config = new ConfigService({ JWT_SECRET: 'disposable-access', JWT_REFRESH_SECRET: 'disposable-refresh', JWT_EXPIRES_IN: '5m', JWT_REFRESH_EXPIRES_IN: '7d' });
    const auth = new AuthService(users, jwt, config, { create: jest.fn() } as any);
    const guard = new JwtAuthGuard(jwt, { getAllAndOverride: () => false } as any, config, db);
    const access = (value: string, cookie = false) => guard.canActivate({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ headers: cookie ? {} : { authorization: `Bearer ${value}` }, cookies: cookie ? { access_token: value } : {} }) }) } as any);
    const old = await auth.login({ email, senha: 'OldPass1!' });
    const legacy = await jwt.signAsync({ sub: 1 }, { secret: 'disposable-access' });
    const legacyRefresh = await jwt.signAsync({ sub: 1 }, { secret: 'disposable-refresh' });
    await expect(access(legacy)).resolves.toBe(true);
    await service.request(email); await service.confirm(dto(token()));
    await expect(access(old.accessToken)).rejects.toThrow();
    await expect(access(old.accessToken, true)).rejects.toThrow();
    await expect(access(legacy)).rejects.toThrow();
    await expect(auth.refresh({ refreshToken: old.refreshToken })).rejects.toThrow();
    await expect(auth.refresh({ refreshToken: legacyRefresh })).rejects.toThrow();
    await expect(auth.login({ email, senha: 'OldPass1!' })).rejects.toThrow();
    const current = await auth.login({ email, senha: 'NovaSenha1!' });
    await expect(access(current.accessToken)).resolves.toBe(true);
    expect(jwt.decode(current.accessToken).credenciaisVersao).toBe(1);
  });
  it('inexistentes/inativos recebem resposta neutra e admissões persistidas', async () => {
    await db.getRepository(Usuario).update(1, { ativo: false });
    for (const target of [email, 'missing@example.com']) {
      expect(await service.request(target)).toEqual({ message: RESET_MESSAGE });
      expect((await db.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digestToken(target) })).admissions).toEqual([now]);
    }
    expect(mail.sendReset).not.toHaveBeenCalled();
  });
  it('falha atrasada revoga apenas sua tentativa, nunca reenvio posterior', async () => {
    await service.request(email); const old = token();
    const lease = (await store.claim(randomUUID()))!;
    expect(await store.prepare(lease)).not.toBeNull();
    clock.mockReturnValue(now + 60000); await service.request(email); const current = token();
    await store.finish(lease, State.FAILED);
    await expect(service.confirm(dto(old))).rejects.toThrow('Link inválido');
    await service.confirm(dto(current));
  });
  it('senhas inválidas/divergentes não consomem', async () => {
    await service.request(email); const raw = token();
    await expect(service.confirm({ ...dto(raw), confirmarSenha: 'Different1!' })).rejects.toThrow();
    await expect(service.confirm({ ...dto(raw), novaSenha: ' spaces ', confirmarSenha: ' spaces ' })).rejects.toThrow();
    await service.confirm(dto(raw));
  });

  it('falha simples de envio mantém links anteriores revogados', async () => {
    await service.request(email); const old = token();
    clock.mockReturnValue(now + 60000);
    expect(await service.request(email)).toEqual({ message: RESET_MESSAGE }); const failed = token();
    const lease = (await store.claim(randomUUID()))!;
    await store.prepare(lease); await store.finish(lease, State.FAILED);
    await expect(service.confirm(dto(old))).rejects.toThrow('Link inválido');
    await expect(service.confirm(dto(failed))).rejects.toThrow('Link inválido');
  });

  it('alteração legada não sobrescreve reset ocorrido após validar senha velha', async () => {
    await service.request(email); await service.confirm(dto(token()));
    await expect(users.updatePassword(1, 'OldCaller1!', 0)).rejects.toThrow('Email ou senha atual inválidos');
    expect(await bcrypt.compare('NovaSenha1!', (await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).senha)).toBe(true);
  });

  it('rollback de alteração da conta não revoga link', async () => {
    await service.request(email); const raw = token();
    await db.query("CREATE TRIGGER reset_test_fail BEFORE UPDATE ON recuperacoes_senha FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'");
    try { await expect(users.updatePassword(1, 'OtherPass1!')).rejects.toThrow(); }
    finally { await db.query('DROP TRIGGER reset_test_fail'); }
    const user = await db.getRepository(Usuario).findOneByOrFail({ id: 1 });
    expect(user.credenciaisVersao).toBe(0); expect(await bcrypt.compare('OldPass1!', user.senha)).toBe(true);
    await service.confirm(dto(raw));
  });

  it('serviço REAL responde com worker/provedor bloqueado, inclusive reenvio sem lock de rede', async () => {
    let release!: () => void; let started!: () => void;
    const sending = new Promise<void>(resolve => { started = resolve; });
    mail.sendReset.mockImplementationOnce(() => { started(); return new Promise<void>(resolve => { release = resolve; }); });
    await expect(service.request(email)).resolves.toEqual({ message: RESET_MESSAGE });
    expect(mail.sendReset).not.toHaveBeenCalled();
    const worker = new PasswordResetDeliveryWorker(store, mail as any, config);
    const processing = worker.tick(); await sending;
    try {
      await expect(service.request('missing@example.com')).resolves.toEqual({ message: RESET_MESSAGE });
      clock.mockReturnValue(now + 60000);
      await expect(service.request(email)).resolves.toEqual({ message: RESET_MESSAGE });
      expect(await db.getRepository(Job).countBy({ status: State.PENDING })).toBe(1);
    } finally { release(); await processing; }
  });
  it('rollback de senha, consumo e versão em falha de atualização', async () => {
    await service.request(email); const raw = token();
    await db.query("CREATE TRIGGER reset_test_fail BEFORE UPDATE ON usuarios FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'");
    try { await expect(service.confirm(dto(raw))).rejects.toThrow(); }
    finally { await db.query('DROP TRIGGER reset_test_fail'); }
    expect((await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).credenciaisVersao).toBe(0);
    expect((await db.getRepository(PasswordReset).findOneByOrFail({ digest: digestToken(raw) })).consumedAt).toBeNull();
    await service.confirm(dto(raw));
  });
  it.each(['password', 'updatePassword', 'email', 'inactive'])('%s invalida pendências', async action => {
    await service.request(email); const raw = token(); const admin = { sub: 2, role: 'ADMIN' };
    if (action === 'password') await users.update(1, { senha: 'NextPass1!' }, admin);
    if (action === 'updatePassword') await users.updatePassword(1, 'NextPass1!');
    if (action === 'email') await users.update(1, { email: 'changed@example.com' }, admin);
    if (action === 'inactive') { await users.remove(1, admin); await users.update(1, { ativo: true }, admin); }
    await expect(service.confirm(dto(raw))).rejects.toThrow('Link inválido');
    expect(await db.getRepository(Job).countBy({ status: State.CANCELLED })).toBe(1);
    expect((await db.getRepository(Job).findOneByOrFail({})).ciphertext).toBeNull();
    if (action.includes('assword')) expect((await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).credenciaisVersao).toBe(1);
  });

  it.each(['enqueue', 'cipher'])('rollback de %s preserva link/job anteriores e admissão', async failure => {
    await service.request(email); const old = token();
    const previous = await db.getRepository(Job).findOneByOrFail({});
    clock.mockReturnValue(now + 60000);
    if (failure === 'enqueue') await db.query("CREATE TRIGGER reset_test_fail BEFORE INSERT ON recuperacao_envios FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'");
    else seal.mockImplementationOnce(() => { throw new Error('private payload'); });
    try { await expect(service.request(email)).rejects.toThrow('Recuperação temporariamente indisponível'); }
    finally { if (failure === 'enqueue') await db.query('DROP TRIGGER reset_test_fail'); }
    expect(await db.getRepository(PasswordReset).count()).toBe(1);
    expect(await db.getRepository(Job).findOneByOrFail({ id: previous.id })).toEqual(previous);
    expect((await db.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digestToken(email) })).admissions).toEqual([now]);
    await service.confirm(dto(old));
  });

  it('config de cifragem ausente é 503 uniforme mesmo para inativo/inexistente/suprimido', async () => {
    await service.request(email);
    await db.getRepository(Usuario).update(1, { ativo: false });
    config.set('PASSWORD_RESET_KEYRING', '');
    for (const target of [email, 'missing@example.com']) await expect(service.request(target)).rejects.toMatchObject({ status: 503 });
    expect(await db.getRepository(PasswordResetLimit).count()).toBe(1);
    expect(await db.getRepository(Job).count()).toBe(1);
  });

  it('snapshot SQL da fila/recuperação não contém token/URL/destinatário em claro; TTL não muda', async () => {
    await service.request(email); const raw = token();
    const rows = [...await db.query('SELECT * FROM recuperacao_envios'), ...await db.query('SELECT * FROM recuperacoes_senha')];
    // Inspect blob bytes too; Buffer's default JSON number array would hide plaintext.
    const dump = rows.flatMap(row => Object.values(row).map(value => Buffer.isBuffer(value) ? value.toString('utf8') : String(value))).join('\n');
    for (const secret of [raw, email, '/redefinir-senha', '#token=']) expect(dump).not.toContain(secret);
    const before = await db.getRepository(PasswordReset).findOneByOrFail({});
    const lease = (await store.claim(randomUUID()))!;
    expect((await store.prepare(lease))?.token).toBe(raw);
    const job = await db.getRepository(Job).findOneByOrFail({});
    expect(job.status).toBe(State.DISPATCHING); expect(job.ciphertext).toBeNull(); expect(job.nonce).toBeNull(); expect(job.authTag).toBeNull(); expect(job.keyId).toBeNull();
    expect(job.dispatchStartedAt).toBeInstanceOf(Date); expect(job.dispatchDeadlineAt!.getTime() - job.dispatchStartedAt!.getTime()).toBe(5000);
    expect((await db.getRepository(PasswordReset).findOneByOrFail({})).expiresAt).toEqual(before.expiresAt);
    expect(await store.claim(randomUUID())).toBeNull();
  });

  it('dois workers/conexões independentes só adquirem uma posse e um despacho', async () => {
    await service.request(email);
    const other = await new DataSource(db.options).initialize();
    try {
      const second = new PasswordResetDeliveryStore(other, cipher);
      const leases = await Promise.all([store.claim(randomUUID()), second.claim(randomUUID())]);
      expect(leases.filter(Boolean)).toHaveLength(1);
      const lease = leases.find(Boolean)!;
      const dispatches = await Promise.all([store.prepare(lease), second.prepare(lease)]);
      expect(dispatches.filter(Boolean)).toHaveLength(1);
    } finally { await other.destroy(); }
  });

  it('SKIP LOCKED não espera job bloqueado em outra conexão', async () => {
    await service.request(email);
    const runner = db.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    try {
      await runner.query('SELECT id FROM recuperacao_envios FOR UPDATE');
      expect(await store.claim(randomUUID())).toBeNull();
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  });

  it('fencing impede renovar/despachar/finalizar owner antigo após recuperação de lease', async () => {
    await service.request(email);
    const stale = (await store.claim(randomUUID()))!;
    await db.query('UPDATE recuperacao_envios SET leaseUntil = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 40 SECOND)');
    expect(await store.renew(stale)).toBe(false);
    const current = (await store.claim(randomUUID()))!;
    expect(current.version).toBe(stale.version + 1);
    expect(await store.prepare(stale)).toBeNull();
    expect(await store.renew(current)).toBe(true);
    expect(await store.prepare(current)).not.toBeNull();
    expect(await store.finish(stale, State.ACCEPTED)).toBe(false);
    expect(await store.finish(current, State.ACCEPTED)).toBe(true);
    expect(await store.finish(current, State.FAILED)).toBe(false);
  });

  it.each(['pending', 'leased'])('restart após %s retoma sem renovar token/validade', async state => {
    await service.request(email); const raw = token();
    const reset = await db.getRepository(PasswordReset).findOneByOrFail({});
    if (state === 'leased') { await store.claim(randomUUID()); await db.query('UPDATE recuperacao_envios SET leaseUntil = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 40 SECOND)'); }
    const other = await new DataSource(db.options).initialize();
    try {
      const restarted = new PasswordResetDeliveryStore(other, new PasswordResetPayloadCipher(config));
      const lease = (await restarted.claim(randomUUID()))!;
      const prepared = await restarted.prepare(lease);
      expect(prepared?.token).toBe(raw); expect(prepared?.expiresAt).toEqual(reset.expiresAt);
    } finally { await other.destroy(); }
  });

  it.each(['before-sdk', 'after-204'])('crash %s depois do marcador nunca reenvia', async point => {
    await service.request(email); const raw = token();
    const lease = (await store.claim(randomUUID()))!;
    const prepared = (await store.prepare(lease))!;
    if (point === 'after-204') await mail.sendReset(prepared.email, prepared.token);
    await db.query('UPDATE recuperacao_envios SET dispatchDeadlineAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)');
    const restarted = new PasswordResetDeliveryWorker(new PasswordResetDeliveryStore(db, cipher), mail as any, config);
    await restarted.tick(); await restarted.tick();
    expect(mail.sendReset).toHaveBeenCalledTimes(point === 'after-204' ? 1 : 0);
    expect((await db.getRepository(Job).findOneByOrFail({})).status).toBe(State.UNKNOWN);
    expect(await store.finish(lease, State.ACCEPTED)).toBe(false);
    await expect(service.confirm(dto(raw))).rejects.toThrow('Link inválido');
  });

  it('204 e erro na finalização repetem só escrita MySQL, nunca SDK', async () => {
    await service.request(email);
    const realFinish = store.finish.bind(store);
    const finish = jest.spyOn(store, 'finish').mockRejectedValueOnce(new Error('db down')).mockImplementation(realFinish);
    await new PasswordResetDeliveryWorker(store, mail as any, config).tick();
    expect(mail.sendReset).toHaveBeenCalledTimes(1); expect(finish).toHaveBeenCalledTimes(2);
    expect((await db.getRepository(Job).findOneByOrFail({})).status).toBe(State.ACCEPTED);
  });

  it('preparação tem três tentativas e backoff 1/4s; nunca restaura prazo', async () => {
    await service.request(email);
    const before = await db.getRepository(PasswordReset).findOneByOrFail({});
    for (let attempt = 1; attempt <= 3; attempt++) {
      const lease = (await store.claim(randomUUID()))!;
      const dbNow = new Date((await db.query('SELECT UTC_TIMESTAMP(3) AS now'))[0].now).getTime();
      await store.retry(lease);
      const job = await db.getRepository(Job).findOneByOrFail({});
      expect(job.attempts).toBe(attempt);
      if (attempt < 3) {
        expect(job.availableAt.getTime()).toBeGreaterThanOrEqual(dbNow + (attempt === 1 ? 1000 : 4000));
        expect(await store.claim(randomUUID())).toBeNull();
        await db.query('UPDATE recuperacao_envios SET availableAt = UTC_TIMESTAMP(3)');
      } else expect(job.status).toBe(State.FAILED);
    }
    expect((await db.getRepository(PasswordReset).findOneByOrFail({})).expiresAt).toEqual(before.expiresAt);
    expect(mail.sendReset).not.toHaveBeenCalled();
  });

  it('crashes repetidos em leased esgotam orçamento sem chamar SDK', async () => {
    await service.request(email);
    for (let i = 0; i < 3; i++) { await store.claim(randomUUID()); await db.query('UPDATE recuperacao_envios SET leaseUntil = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 40 SECOND)'); }
    await new PasswordResetDeliveryWorker(store, mail as any, config).tick();
    expect(mail.sendReset).not.toHaveBeenCalled(); expect((await db.getRepository(Job).findOneByOrFail({})).status).toBe(State.FAILED);
  });

  it.each([0, 5])('não despacha com %is restantes; expiração elimina envelope', async seconds => {
    await service.request(email);
    await db.query('UPDATE recuperacoes_senha SET expiresAt = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND)', [seconds]);
    await new PasswordResetDeliveryWorker(store, mail as any, config).tick();
    expect(mail.sendReset).not.toHaveBeenCalled();
    expect(await db.getRepository(Job).findOneByOrFail({})).toMatchObject({ status: State.EXPIRED, ciphertext: null });
  });

  it.each(['ciphertext', 'nonce', 'authTag', 'digest', 'issuedAt', 'payloadVersion'])('tamper persistido %s falha fechado e revoga só sua tentativa', async field => {
    await service.request(email);
    const job = await db.getRepository(Job).findOneByOrFail({});
    if (['ciphertext', 'nonce', 'authTag'].includes(field)) {
      const value = Buffer.from(job[field]); value[0] ^= 1;
      await db.getRepository(Job).update(job.id, { [field]: value });
    } else if (field === 'payloadVersion') await db.getRepository(Job).update(job.id, { payloadVersion: 2 });
    else await db.getRepository(PasswordReset).update(job.recuperacaoId, field === 'digest' ? { digest: 'a'.repeat(64) } : { issuedAt: new Date(now - 1) });
    await new PasswordResetDeliveryWorker(store, mail as any, config).tick();
    expect(mail.sendReset).not.toHaveBeenCalled();
    expect(await db.getRepository(Job).findOneByOrFail({})).toMatchObject({ status: State.FAILED, lastErrorCode: 'payload_invalid', ciphertext: null });
    expect((await db.getRepository(PasswordReset).findOneByOrFail({})).revokedAt).not.toBeNull();
  });

  it('rotação real e chave temporariamente desconhecida aguardam config apenas dentro TTL', async () => {
    await service.request(email); const old = token();
    const newKey = randomBytes(32).toString('base64');
    config.set('PASSWORD_RESET_ACTIVE_KEY_ID', 'new'); config.set('PASSWORD_RESET_KEYRING', JSON.stringify({ new: newKey }));
    const lease = (await store.claim(randomUUID()))!;
    expect(await store.prepare(lease)).toBeNull();
    expect(await db.getRepository(Job).findOneByOrFail({})).toMatchObject({ status: State.PENDING, attempts: 0, lastErrorCode: 'key_unavailable' });
    config.set('PASSWORD_RESET_KEYRING', JSON.stringify({ new: newKey, test: testKey }));
    await db.query('UPDATE recuperacao_envios SET availableAt = UTC_TIMESTAMP(3)');
    expect((await store.prepare((await store.claim(randomUUID()))!))?.token).toBe(old);
    clock.mockReturnValue(now + 60000); await service.request(email);
    expect((await db.getRepository(Job).findOneByOrFail({ status: State.PENDING })).keyId).toBe('new');
    config.set('PASSWORD_RESET_KEYRING', JSON.stringify({ test: testKey })); config.set('PASSWORD_RESET_ACTIVE_KEY_ID', 'test');
    await db.query('UPDATE recuperacoes_senha SET expiresAt = UTC_TIMESTAMP(3) WHERE id = (SELECT recuperacaoId FROM recuperacao_envios WHERE status = ?)', [State.PENDING]);
    await store.maintain(); expect(await db.getRepository(Job).countBy({ status: State.EXPIRED })).toBe(1);
    expect(mail.sendReset).not.toHaveBeenCalled();
  });

  it('reenvio cancela owner leased; confirmação cancela job e envelope', async () => {
    await service.request(email); const lease = (await store.claim(randomUUID()))!;
    clock.mockReturnValue(now + 60000); await service.request(email);
    expect(await store.prepare(lease)).toBeNull();
    await service.confirm(dto(token()));
    expect(await db.getRepository(Job).countBy({ status: State.CANCELLED })).toBe(2);
    expect((await db.getRepository(Job).find()).every(job => job.ciphertext === null)).toBe(true);
  });

  it.each(['password', 'email', 'inactive'])('falha ao cancelar job faz rollback de alteração %s e JWT/versão', async action => {
    await service.request(email); const raw = token();
    await db.query("CREATE TRIGGER reset_test_fail BEFORE UPDATE ON recuperacao_envios FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'");
    try {
      const changes = action === 'password' ? { senha: 'NewPass1!' } : action === 'email' ? { email: 'changed@example.com' } : { ativo: false };
      await expect(users.update(1, changes, { sub: 2, role: 'ADMIN' })).rejects.toThrow();
    } finally { await db.query('DROP TRIGGER reset_test_fail'); }
    const user = await db.getRepository(Usuario).findOneByOrFail({ id: 1 });
    expect(user).toMatchObject({ email, ativo: true, credenciaisVersao: 0 });
    expect(await bcrypt.compare('OldPass1!', user.senha)).toBe(true);
    expect((await db.getRepository(Job).findOneByOrFail({})).status).toBe(State.PENDING);
    await service.confirm(dto(raw));
  });

  it('limpeza elimina envelopes mesmo envio desabilitado; preserva metadados24h e admissões recentes', async () => {
    await service.request(email); await service.request('missing@example.com');
    await db.query('UPDATE recuperacoes_senha SET expiresAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)');
    config.set('PASSWORD_RESET_DELIVERY_ENABLED', 'false');
    await new PasswordResetDeliveryWorker(store, mail as any, config).tick();
    expect(await db.getRepository(Job).findOneByOrFail({})).toMatchObject({ status: State.EXPIRED, ciphertext: null });
    expect(await db.getRepository(PasswordResetLimit).count()).toBe(2);
    await db.query('UPDATE recuperacoes_senha SET revokedAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 25 HOUR), expiresAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 25 HOUR)');
    await db.query('UPDATE recuperacao_envios SET completedAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 25 HOUR)');
    await db.getRepository(PasswordResetLimit).update({ emailDigest: digestToken('missing@example.com') }, { admissions: [now - 3600001] });
    await store.maintain();
    expect(await db.getRepository(Job).count()).toBe(0); expect(await db.getRepository(PasswordReset).count()).toBe(0);
    expect((await db.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digestToken(email) })).admissions).toEqual([now]);
    expect(await db.getRepository(PasswordResetLimit).count()).toBe(1);
    expect(mail.sendReset).not.toHaveBeenCalled();
  });

  it('admissão/limpeza concorrentes preservam bucket após reavaliar sob lock', async () => {
    await service.request('missing@example.com');
    const digest = digestToken('missing@example.com');
    await db.getRepository(PasswordResetLimit).update({ emailDigest: digest }, { admissions: [now - 7200000] });
    await Promise.all([store.maintain(), service.request('missing@example.com')]);
    expect((await db.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digest })).admissions).toEqual([now]);
  });

  it('confirmação/reenvio/limpeza concorrentes preservam último link e não deadlockam', async () => {
    await service.request(email); const raw = token(); clock.mockReturnValue(now + 60000);
    const results = await Promise.allSettled([service.confirm(dto(raw)), service.request(email), store.maintain()]);
    expect(results[1].status).toBe('fulfilled'); expect(results[2].status).toBe('fulfilled');
    await service.confirm(dto(token()));
  });

  it('migração aditiva up-down-up mantém recuperação legada e credenciaisVersao', async () => {
    await service.request(email); const raw = token();
    await db.getRepository(Usuario).update(1, { credenciaisVersao: 7 });
    const runner = db.createQueryRunner();
    try { await queueMigration.down(runner); await queueMigration.up(runner); }
    finally { await runner.release(); }
    expect(await db.getRepository(Job).count()).toBe(0);
    expect((await db.getRepository(Usuario).findOneByOrFail({ id: 1 })).credenciaisVersao).toBe(7);
    expect((await db.getRepository(PasswordReset).findOneByOrFail({})).digest).toBe(digestToken(raw));
    await db.getRepository(Usuario).update(1, { credenciaisVersao: 0 }); await service.confirm(dto(raw));
  });

  it.each(['rejected', 'unknown'] as const)('outcome %s no worker/MySQL é terminal sem replay nem logs sensíveis', async outcome => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    await service.request(email); const raw = token();
    mail.sendReset.mockRejectedValue(new MailDeliveryError(outcome));
    const worker = new PasswordResetDeliveryWorker(store, mail as any, config);
    await worker.tick(); await worker.tick();
    expect(mail.sendReset).toHaveBeenCalledTimes(1);
    expect(await db.getRepository(Job).findOneByOrFail({})).toMatchObject({ status: outcome === 'rejected' ? State.FAILED : State.UNKNOWN, ciphertext: null });
    const logs = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls]);
    for (const secret of [raw, email, digestToken(raw), testKey]) expect(logs).not.toContain(secret);
  });

  it('troca de envelopes entre jobs de usuários diferentes não autentica', async () => {
    await service.request(email);
    const first = await db.getRepository(Job).findOneByOrFail({});
    await db.query('INSERT INTO usuarios (id,nome,email,senha,telefone) VALUES (2,?,?,?,?)', ['Other', 'other@example.com', await bcrypt.hash('OldPass1!', 10), '11900000001']);
    await service.request('other@example.com');
    const second = (await db.getRepository(Job).find()).find(job => job.id !== first.id)!;
    await db.getRepository(Job).update(second.id, { keyId: first.keyId, nonce: first.nonce, authTag: first.authTag, ciphertext: first.ciphertext });
    const leases = [(await store.claim(randomUUID()))!, (await store.claim(randomUUID()))!];
    const invalid = leases.find(lease => lease.id === second.id)!;
    expect(await store.prepare(invalid)).toBeNull();
    expect((await db.getRepository(Job).findOneByOrFail({ id: second.id })).status).toBe(State.FAILED);
    expect(await store.prepare(leases.find(lease => lease.id === first.id)!)).not.toBeNull();
  });

  it('schema exige envelope completo preparatório e proíbe envelope terminal', async () => {
    await service.request(email); const job = await db.getRepository(Job).findOneByOrFail({});
    await expect(db.getRepository(Job).update(job.id, { ciphertext: null })).rejects.toThrow();
    await expect(db.getRepository(Job).update(job.id, { status: State.UNKNOWN })).rejects.toThrow();
    expect((await db.getRepository(Job).findOneByOrFail({ id: job.id })).status).toBe(State.PENDING);
  });

  it('limpeza revalida buckets bloqueados e não remove admissão concorrente recente', async () => {
    await service.request('missing@example.com'); const digest = digestToken('missing@example.com');
    await db.getRepository(PasswordResetLimit).update({ emailDigest: digest }, { admissions: [now - 7200000] });
    const runner = db.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    await runner.query('SELECT * FROM recuperacao_limites WHERE emailDigest = ? FOR UPDATE', [digest]);
    const original = db.query.bind(db);
    let selected!: () => void;
    const selection = new Promise<void>(resolve => { selected = resolve; });
    const query = jest.spyOn(db, 'query').mockImplementation(async (...args: Parameters<DataSource['query']>) => {
      const result = await original(...args);
      if (args[0].includes('SELECT emailDigest FROM recuperacao_limites')) selected();
      return result;
    });
    const cleaning = store.maintain();
    try {
      await selection;
      await runner.query('UPDATE recuperacao_limites SET admissions = ? WHERE emailDigest = ?', [JSON.stringify([now]), digest]);
      await runner.commitTransaction(); await cleaning;
      expect((await db.getRepository(PasswordResetLimit).findOneByOrFail({ emailDigest: digest })).admissions).toEqual([now]);
    } finally { query.mockRestore(); if (runner.isTransactionActive) await runner.rollbackTransaction(); await runner.release(); }
  });
});