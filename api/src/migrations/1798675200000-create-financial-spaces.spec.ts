import { QueryRunner, TableIndex } from 'typeorm';

import { CreateFinancialSpaces1798675200000 } from './1798675200000-create-financial-spaces';

describe('CreateFinancialSpaces1798675200000', () => {
  it('cria espaços pessoais, faz backfill e troca a unicidade dos saldos', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const legacyIndex = new TableIndex({
      name: 'indice_renomeado_pelo_typeorm',
      columnNames: ['usuarioId', 'contaId', 'periodo'],
      isUnique: true,
    });
    const queryRunner = {
      query,
      getTable: jest.fn().mockResolvedValue({ indices: [legacyIndex] }),
      dropIndex: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;

    await new CreateFinancialSpaces1798675200000().up(queryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('CREATE TABLE `espacos`');
    expect(sql).toContain('CREATE TABLE `espaco_membros`');
    expect(sql).toContain("CONCAT('Espaço pessoal de ', usuarios.nome)");
    expect(sql).toContain("'OWNER'");
    for (const table of [
      'contas',
      'categorias',
      'orcamentos',
      'reservas',
      'movimentos',
    ]) {
      expect(sql).toContain(`ALTER TABLE \`${table}\` ADD \`espacoId\``);
      expect(sql).toContain(`UPDATE \`${table}\``);
    }
    expect(sql).toContain('PARTITION BY contaId, periodo');
    expect(queryRunner.dropIndex).toHaveBeenCalledWith(
      'saldo_iniciais',
      legacyIndex,
    );
    expect(queryRunner.createIndex).toHaveBeenCalledWith(
      'saldo_iniciais',
      expect.objectContaining({
        name: 'idx_saldo_iniciais_usuario',
        columnNames: ['usuarioId'],
      }),
    );
    expect(queryRunner.createIndex).toHaveBeenCalledWith(
      'saldo_iniciais',
      expect.objectContaining({
        name: 'uq_saldo_conta_periodo',
        columnNames: ['contaId', 'periodo'],
        isUnique: true,
      }),
    );
    expect(sql).toContain(
      'FOREIGN KEY (`espacoId`) REFERENCES `espacos`(`id`)',
    );
    expect(sql).toContain(
      'FOREIGN KEY (`espacoId`) REFERENCES `espacos`(`id`) ON DELETE RESTRICT',
    );
  });

  it('é irreversível porque consolida saldos e propriedade legada', async () => {
    await expect(
      new CreateFinancialSpaces1798675200000().down(),
    ).rejects.toThrow('irreversível');
  });
});
