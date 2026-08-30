import { QueryRunner } from 'typeorm';

import { HardenFinancialSpaces1798758000000 } from './1798758000000-harden-financial-spaces';

describe('HardenFinancialSpaces1798758000000', () => {
  it('classifica espaços existentes e cria unicidade por owner e nome normalizado', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = {
      query,
      hasColumn: jest.fn().mockResolvedValue(false),
      getTable: jest.fn().mockResolvedValue({ indices: [] }),
    } as unknown as QueryRunner;

    await new HardenFinancialSpaces1798758000000().up(queryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain("ADD `tipo` enum('PERSONAL','SHARED')");
    expect(sql).toContain('MIN(`id`) AS `personalId`');
    expect(sql).toContain("SET espaco.`tipo` = 'PERSONAL'");
    expect(sql).toContain('HAVING COUNT(*) > 1');
    expect(sql).toContain('SIGNAL SQLSTATE');
    expect(sql).toContain('GENERATED ALWAYS AS (LOWER(TRIM(`nome`))) STORED');
    expect(sql).toContain('UNIQUE INDEX `uq_espacos_owner_nome_normalizado`');
  });

  it('retoma sem recriar colunas e índice já aplicados', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = {
      query,
      hasColumn: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        indices: [{ name: 'uq_espacos_owner_nome_normalizado' }],
      }),
    } as unknown as QueryRunner;

    await new HardenFinancialSpaces1798758000000().up(queryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).not.toContain('ADD `tipo`');
    expect(sql).not.toContain('ADD `nomeNormalizado`');
    expect(sql).not.toContain('ADD UNIQUE INDEX');
  });

  it('remove índice e colunas no rollback estrutural', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = {
      query,
      hasColumn: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        indices: [{ name: 'uq_espacos_owner_nome_normalizado' }],
      }),
    } as unknown as QueryRunner;

    await new HardenFinancialSpaces1798758000000().down(queryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('DROP INDEX `uq_espacos_owner_nome_normalizado`');
    expect(sql).toContain('DROP COLUMN `nomeNormalizado`');
    expect(sql).toContain('DROP COLUMN `tipo`');
  });
});
