import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateFinancialSpaces1798675200000 implements MigrationInterface {
  name = 'CreateFinancialSpaces1798675200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`espacos\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`nome\` varchar(120) NOT NULL,
        \`ownerUsuarioId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_espacos_owner\` (\`ownerUsuarioId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_espacos_owner\` FOREIGN KEY (\`ownerUsuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE \`espaco_membros\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`espacoId\` int NOT NULL,
        \`usuarioId\` int NOT NULL,
        \`papel\` enum('OWNER','EDITOR','VIEWER') NOT NULL,
        \`ownerEspacoId\` int GENERATED ALWAYS AS (CASE WHEN \`papel\` = 'OWNER' THEN \`espacoId\` ELSE NULL END) STORED,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_espaco_membro\` (\`espacoId\`, \`usuarioId\`),
        UNIQUE INDEX \`uq_espaco_owner\` (\`ownerEspacoId\`),
        INDEX \`idx_espaco_membros_usuario\` (\`usuarioId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_espaco_membros_espaco\` FOREIGN KEY (\`espacoId\`) REFERENCES \`espacos\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_espaco_membros_usuario\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      INSERT INTO \`espacos\` (\`nome\`, \`ownerUsuarioId\`)
      SELECT CONCAT('Espaço pessoal de ', usuarios.nome), usuarios.id
      FROM usuarios
    `);
    await queryRunner.query(`
      INSERT INTO \`espaco_membros\` (\`espacoId\`, \`usuarioId\`, \`papel\`)
      SELECT espacos.id, espacos.ownerUsuarioId, 'OWNER'
      FROM espacos
    `);

    for (const table of [
      'contas',
      'categorias',
      'orcamentos',
      'reservas',
      'movimentos',
    ]) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`espacoId\` int NULL`,
      );
      await queryRunner.query(`
        UPDATE \`${table}\`
        INNER JOIN \`espacos\` ON \`espacos\`.\`ownerUsuarioId\` = \`${table}\`.\`usuarioId\`
        SET \`${table}\`.\`espacoId\` = \`espacos\`.\`id\`
      `);
      await queryRunner.query(
        `ALTER TABLE \`${table}\` MODIFY \`espacoId\` int NOT NULL`,
      );
      await queryRunner.query(
        `CREATE INDEX \`idx_${table}_espaco\` ON \`${table}\` (\`espacoId\`)`,
      );
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`fk_${table}_espaco\` FOREIGN KEY (\`espacoId\`) REFERENCES \`espacos\`(\`id\`) ON DELETE CASCADE`,
      );
    }

    await queryRunner.query(`
      DELETE saldoDuplicado
      FROM saldo_iniciais saldoDuplicado
      INNER JOIN (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY contaId, periodo
          ORDER BY criadoPorManual DESC, updatedAt DESC, id DESC
        ) AS ordem
        FROM saldo_iniciais
      ) ordenados ON ordenados.id = saldoDuplicado.id
      WHERE ordenados.ordem > 1
    `);
    const saldoTable = await queryRunner.getTable('saldo_iniciais');
    const legacyIndex = saldoTable?.indices.find(
      (index) =>
        index.isUnique &&
        index.columnNames.join(',') === 'usuarioId,contaId,periodo',
    );
    const usuarioIndex = saldoTable?.indices.find(
      (index) => index.columnNames.join(',') === 'usuarioId',
    );
    if (!usuarioIndex) {
      await queryRunner.createIndex(
        'saldo_iniciais',
        new TableIndex({
          name: 'idx_saldo_iniciais_usuario',
          columnNames: ['usuarioId'],
        }),
      );
    }
    if (legacyIndex) {
      await queryRunner.dropIndex('saldo_iniciais', legacyIndex);
    }
    await queryRunner.createIndex(
      'saldo_iniciais',
      new TableIndex({
        name: 'uq_saldo_conta_periodo',
        columnNames: ['contaId', 'periodo'],
        isUnique: true,
      }),
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'Migração irreversível: o backfill de propriedade e a consolidação de saldos não podem ser desfeitos com segurança.',
    );
  }
}
