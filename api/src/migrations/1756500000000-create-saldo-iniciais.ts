import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaldoIniciais1756500000000 implements MigrationInterface {
  name = 'CreateSaldoIniciais1756500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saldo_iniciais (
        id int NOT NULL AUTO_INCREMENT,
        usuarioId int NOT NULL,
        contaId int NOT NULL,
        periodo varchar(7) NOT NULL,
        valor decimal(10,2) NOT NULL DEFAULT '0.00',
        origem enum('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
        criadoPorManual boolean NOT NULL DEFAULT false,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_saldo_iniciais_usuario_conta_periodo (usuarioId, contaId, periodo),
        KEY IDX_saldo_iniciais_usuario (usuarioId),
        KEY IDX_saldo_iniciais_conta (contaId),
        KEY IDX_saldo_iniciais_periodo (periodo),
        PRIMARY KEY (id),
        CONSTRAINT FK_saldo_iniciais_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT FK_saldo_iniciais_conta FOREIGN KEY (contaId) REFERENCES contas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      INSERT INTO saldo_iniciais (usuarioId, contaId, periodo, valor, origem, criadoPorManual)
      SELECT
        movimentos.usuarioId,
        movimentos.contaId,
        movimentos.periodo,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) = 'RECEITA' THEN m2.valor
              WHEN COALESCE(categoria.tipo, orcamentoItemCategoria.tipo) IN ('DESPESA', 'RESERVA') THEN -m2.valor
              ELSE 0
            END
          )
          FROM movimentos m2
          LEFT JOIN categorias categoria ON categoria.id = m2.categoriaId
          LEFT JOIN orcamento_items orcamentoItem ON orcamentoItem.id = m2.orcamentoItemId
          LEFT JOIN categorias orcamentoItemCategoria ON orcamentoItemCategoria.id = orcamentoItem.categoriaId
          WHERE m2.usuarioId = movimentos.usuarioId
            AND m2.contaId = movimentos.contaId
            AND m2.periodo < movimentos.periodo
        ), 0) AS valor,
        'AUTO',
        false
      FROM (
        SELECT DISTINCT usuarioId, contaId, periodo
        FROM movimentos
        WHERE contaId IS NOT NULL
      ) AS movimentos
      LEFT JOIN saldo_iniciais existentes
        ON existentes.usuarioId = movimentos.usuarioId
       AND existentes.contaId = movimentos.contaId
       AND existentes.periodo = movimentos.periodo
      WHERE existentes.id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS saldo_iniciais;');
  }
}
