import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddWhatsappCrashSafetyAndComprovanteCardinality1798502400000 implements MigrationInterface {
  name = 'AddWhatsappCrashSafetyAndComprovanteCardinality1798502400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_inbound_checkpoints (
        id int NOT NULL AUTO_INCREMENT,
        providerMessageId varchar(120) NOT NULL,
        etapa enum('UPLOAD','ANALISE','RESULTADO') NOT NULL,
        ordinal int NOT NULL DEFAULT 0,
        dados json NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_whatsapp_checkpoint_etapa (providerMessageId, etapa, ordinal)
      ) ENGINE=InnoDB
    `);

    await this.addColumnIfMissing(
      queryRunner,
      'movimentos',
      new TableColumn({ name: 'comprovanteId', type: 'int', isNullable: true }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'movimentos',
      new TableColumn({
        name: 'idempotencyKey',
        type: 'varchar',
        length: '190',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'movimento_comprovantes',
      new TableColumn({
        name: 'idempotencyKey',
        type: 'varchar',
        length: '190',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE movimentos movimento
      INNER JOIN movimento_comprovantes comprovante
        ON comprovante.movimentoId = movimento.id
      SET movimento.comprovanteId = comprovante.id
      WHERE movimento.comprovanteId IS NULL
    `);

    await this.createIndexIfMissing(
      queryRunner,
      'movimentos',
      new TableIndex({
        name: 'UQ_movimentos_idempotencyKey',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'movimento_comprovantes',
      new TableIndex({
        name: 'UQ_movimento_comprovantes_idempotencyKey',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
    await this.createIndexIfMissing(
      queryRunner,
      'movimentos',
      new TableIndex({
        name: 'IDX_movimentos_comprovanteId',
        columnNames: ['comprovanteId'],
      }),
    );

    const movimentos = await queryRunner.getTable('movimentos');
    if (
      movimentos &&
      !movimentos.foreignKeys.some(
        (foreignKey) =>
          foreignKey.columnNames.length === 1 &&
          foreignKey.columnNames[0] === 'comprovanteId' &&
          foreignKey.referencedTableName === 'movimento_comprovantes',
      )
    ) {
      await queryRunner.createForeignKey(
        'movimentos',
        new TableForeignKey({
          name: 'FK_movimentos_comprovante',
          columnNames: ['comprovanteId'],
          referencedTableName: 'movimento_comprovantes',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE movimento_comprovantes comprovante
      INNER JOIN (
        SELECT comprovanteId, MIN(id) AS movimentoId
        FROM movimentos
        WHERE comprovanteId IS NOT NULL
        GROUP BY comprovanteId
      ) vinculo ON vinculo.comprovanteId = comprovante.id
      SET comprovante.movimentoId = vinculo.movimentoId
      WHERE comprovante.movimentoId IS NULL
    `);

    const movimentos = await queryRunner.getTable('movimentos');
    const foreignKeys =
      movimentos?.foreignKeys.filter((item) =>
        item.columnNames.includes('comprovanteId'),
      ) || [];
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('movimentos', foreignKey);
    }

    await this.dropIndexIfPresent(
      queryRunner,
      'movimentos',
      'IDX_movimentos_comprovanteId',
    );
    await this.dropIndexIfPresent(
      queryRunner,
      'movimentos',
      'UQ_movimentos_idempotencyKey',
    );
    await this.dropIndexIfPresent(
      queryRunner,
      'movimento_comprovantes',
      'UQ_movimento_comprovantes_idempotencyKey',
    );
    await this.dropColumnIfPresent(queryRunner, 'movimentos', 'comprovanteId');
    await this.dropColumnIfPresent(queryRunner, 'movimentos', 'idempotencyKey');
    await this.dropColumnIfPresent(
      queryRunner,
      'movimento_comprovantes',
      'idempotencyKey',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS whatsapp_inbound_checkpoints',
    );
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    column: TableColumn,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table && !table.findColumnByName(column.name)) {
      await queryRunner.addColumn(tableName, column);
    }
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (
      table &&
      !table.indices.some(
        (item) =>
          item.isUnique === index.isUnique &&
          item.columnNames.length === index.columnNames.length &&
          item.columnNames.every((columnName) =>
            index.columnNames.includes(columnName),
          ),
      )
    ) {
      await queryRunner.createIndex(tableName, index);
    }
  }

  private async dropIndexIfPresent(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find((item) => item.name === indexName);
    if (index) {
      await queryRunner.dropIndex(tableName, index);
    }
  }

  private async dropColumnIfPresent(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.findColumnByName(columnName)) {
      await queryRunner.dropColumn(tableName, columnName);
    }
  }
}
