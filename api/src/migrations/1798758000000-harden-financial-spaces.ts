import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenFinancialSpaces1798758000000 implements MigrationInterface {
  name = 'HardenFinancialSpaces1798758000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('espacos', 'tipo'))) {
      await queryRunner.query(`
        ALTER TABLE \`espacos\`
        ADD \`tipo\` enum('PERSONAL','SHARED') NOT NULL DEFAULT 'SHARED'
        AFTER \`nome\`
      `);
    }
    await queryRunner.query(`
      UPDATE \`espacos\` espaco
      INNER JOIN (
        SELECT \`ownerUsuarioId\`, MIN(\`id\`) AS \`personalId\`
        FROM \`espacos\`
        GROUP BY \`ownerUsuarioId\`
      ) primeiro ON primeiro.\`personalId\` = espaco.\`id\`
      SET espaco.\`tipo\` = 'PERSONAL'
    `);
    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS `assert_espacos_nomes_unicos`',
    );
    await queryRunner.query(`
      CREATE PROCEDURE \`assert_espacos_nomes_unicos\`()
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM \`espacos\`
          GROUP BY \`ownerUsuarioId\`, LOWER(TRIM(\`nome\`))
          HAVING COUNT(*) > 1
        ) THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Existem nomes de espaços duplicados para o mesmo proprietário';
        END IF;
      END
    `);
    await queryRunner.query('CALL `assert_espacos_nomes_unicos`()');
    await queryRunner.query('DROP PROCEDURE `assert_espacos_nomes_unicos`');
    if (!(await queryRunner.hasColumn('espacos', 'nomeNormalizado'))) {
      await queryRunner.query(`
        ALTER TABLE \`espacos\`
        ADD \`nomeNormalizado\` varchar(120)
          GENERATED ALWAYS AS (LOWER(TRIM(\`nome\`))) STORED
      `);
    }
    const table = await queryRunner.getTable('espacos');
    if (
      !table?.indices.some(
        (index) => index.name === 'uq_espacos_owner_nome_normalizado',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`espacos\`
        ADD UNIQUE INDEX \`uq_espacos_owner_nome_normalizado\`
          (\`ownerUsuarioId\`, \`nomeNormalizado\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('espacos');
    if (
      table?.indices.some(
        (index) => index.name === 'uq_espacos_owner_nome_normalizado',
      )
    ) {
      await queryRunner.query(
        'ALTER TABLE `espacos` DROP INDEX `uq_espacos_owner_nome_normalizado`',
      );
    }
    if (await queryRunner.hasColumn('espacos', 'nomeNormalizado')) {
      await queryRunner.query(
        'ALTER TABLE `espacos` DROP COLUMN `nomeNormalizado`',
      );
    }
    if (await queryRunner.hasColumn('espacos', 'tipo')) {
      await queryRunner.query('ALTER TABLE `espacos` DROP COLUMN `tipo`');
    }
  }
}
