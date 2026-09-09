process.env.TZ = 'America/Sao_Paulo';

import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DatabaseConfig } from '../src/config/database.config';

// Standalone mirror of Movimento's columns (no relations), so metadata building
// isn't dragged into the full entity graph (Usuario, Espaco, Conta, etc.).
@Entity('movimentos')
class MovimentoDataTeste {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  espacoId: number;

  @Column({ length: 7 })
  periodo: string;

  @Column({ type: 'date', nullable: true })
  data: string | Date | null;

  @Column({ length: 500, nullable: true })
  descricao: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  valor: number | null;

  @Column({ nullable: true })
  orcamentoItemId: number;

  @Column({ nullable: true })
  categoriaId: number;

  @Column({ nullable: true })
  contaId: number;

  @Column({ nullable: true })
  comprovanteId: number | null;

  @Column({ default: false })
  revisado: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

const entities = [MovimentoDataTeste];

// Opt-in ONLY: fixed loopback, disposable database/credentials, never .env.
const mysql = process.env.MOVIMENTO_DATA_MYSQL_TEST === '1' ? describe : describe.skip;

// Same helper used in production (movimentacoes.service.ts) to build a Date from 'YYYY-MM-DD'.
const parseDataSemTimezone = (data: string): Date => {
  const [ano, mes, dia] = data.split('T')[0].split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

mysql('Movimento.data hidratação MySQL real isolada (regressão de fuso horário)', () => {
  let db: DataSource;

  beforeAll(async () => {
    const options = new DatabaseConfig(new ConfigService()).createTypeOrmOptions();
    const admin = await new DataSource({
      ...options,
      type: 'mysql',
      host: '127.0.0.1',
      port: 13367,
      username: 'root',
      password: 'disposable-test-only',
      database: undefined,
      entities: [],
      migrations: [],
      synchronize: false,
    } as DataSourceOptions).initialize();
    await admin.query('DROP DATABASE IF EXISTS movimento_data_test');
    // (admin connection has no entities; only used to create the schema)
    await admin.query('CREATE DATABASE movimento_data_test');
    await admin.destroy();

    db = await new DataSource({
      ...options,
      type: 'mysql',
      host: '127.0.0.1',
      port: 13367,
      username: 'root',
      password: 'disposable-test-only',
      database: 'movimento_data_test',
      entities,
      migrations: [],
      synchronize: false,
    } as DataSourceOptions).initialize();
    await db.query(`CREATE TABLE movimentos (
      id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuarioId int NOT NULL,
      espacoId int NOT NULL,
      periodo varchar(7) NOT NULL,
      data date NULL,
      descricao varchar(500) NULL,
      valor decimal(10,2) NULL,
      orcamentoItemId int NULL,
      categoriaId int NULL,
      contaId int NULL,
      comprovanteId int NULL,
      revisado tinyint NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
  }, 30000);

  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query('DROP DATABASE IF EXISTS movimento_data_test');
      await db.destroy();
    }
  });

  it.each([
    ['meio do mês', '2026-01-15'],
    ['fronteira de mês', '2026-03-01'],
  ])('persiste e relê data %s (%s) sem deslocamento de fuso', async (_label, esperado) => {
    const repo = db.getRepository(MovimentoDataTeste);
    const inserted = await repo.save(
      repo.create({
        usuarioId: 1,
        espacoId: 1,
        periodo: esperado.slice(0, 7),
        data: parseDataSemTimezone(esperado),
        revisado: false,
      }),
    );

    const rehydrated = await repo.findOneBy({ id: inserted.id });

    expect(rehydrated).not.toBeNull();
    expect(rehydrated!.data).toBe(esperado);
  });
});
