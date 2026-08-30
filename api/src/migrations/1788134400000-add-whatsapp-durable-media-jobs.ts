import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddWhatsappDurableMediaJobs1788134400000 implements MigrationInterface {
  name = 'AddWhatsappDurableMediaJobs1788134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE whatsapp_inbound_messages
      MODIFY statusProcessamento enum('RECEBIDA','PROCESSANDO','AGUARDANDO_RETRY','PROCESSADA','IGNORADA_NAO_SUPORTADA','FALHA') NOT NULL DEFAULT 'RECEBIDA'
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_inbound_jobs (
        id int NOT NULL AUTO_INCREMENT,
        providerMessageId varchar(120) NOT NULL,
        payload json NOT NULL,
        status enum('PENDENTE','PROCESSANDO','AGUARDANDO_RETRY','CONCLUIDO','FALHA','IGNORADO') NOT NULL DEFAULT 'PENDENTE',
        tentativas int NOT NULL DEFAULT 0,
        maxTentativas int NOT NULL DEFAULT 5,
        proximaTentativaEm datetime NULL,
        leaseAte datetime NULL,
        leasedBy varchar(80) NULL,
        ultimoErro varchar(500) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_whatsapp_inbound_jobs_providerMessageId (providerMessageId),
        KEY IDX_whatsapp_inbound_jobs_claim (status, proximaTentativaEm, leaseAte)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_inbound_results (
        id int NOT NULL AUTO_INCREMENT,
        inboundMessageId int NOT NULL,
        movimentoId int NULL,
        comprovanteId int NULL,
        ordinal int NOT NULL,
        status varchar(40) NOT NULL,
        detalhes json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_whatsapp_inbound_results_ordinal (inboundMessageId, ordinal),
        KEY IDX_whatsapp_inbound_results_movimento (movimentoId),
        CONSTRAINT FK_whatsapp_inbound_results_inbound FOREIGN KEY (inboundMessageId) REFERENCES whatsapp_inbound_messages(id) ON DELETE CASCADE,
        CONSTRAINT FK_whatsapp_inbound_results_movimento FOREIGN KEY (movimentoId) REFERENCES movimentos(id) ON DELETE SET NULL,
        CONSTRAINT FK_whatsapp_inbound_results_comprovante FOREIGN KEY (comprovanteId) REFERENCES movimento_comprovantes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    const jobTable = await queryRunner.getTable('whatsapp_inbound_jobs');
    if (
      jobTable &&
      !jobTable.indices.some(
        (index) => index.name === 'IDX_whatsapp_inbound_jobs_claim',
      )
    ) {
      await queryRunner.createIndex(
        'whatsapp_inbound_jobs',
        new TableIndex({
          name: 'IDX_whatsapp_inbound_jobs_claim',
          columnNames: ['status', 'proximaTentativaEm', 'leaseAte'],
        }),
      );
    }

    const resultTable = await queryRunner.getTable('whatsapp_inbound_results');
    if (resultTable) {
      const foreignKeys = [
        new TableForeignKey({
          name: 'FK_whatsapp_inbound_results_inbound',
          columnNames: ['inboundMessageId'],
          referencedTableName: 'whatsapp_inbound_messages',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          name: 'FK_whatsapp_inbound_results_movimento',
          columnNames: ['movimentoId'],
          referencedTableName: 'movimentos',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          name: 'FK_whatsapp_inbound_results_comprovante',
          columnNames: ['comprovanteId'],
          referencedTableName: 'movimento_comprovantes',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ];
      for (const foreignKey of foreignKeys) {
        if (
          !resultTable.foreignKeys.some((item) => item.name === foreignKey.name)
        ) {
          await queryRunner.createForeignKey(
            'whatsapp_inbound_results',
            foreignKey,
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS whatsapp_inbound_results');
    await queryRunner.query('DROP TABLE IF EXISTS whatsapp_inbound_jobs');
    await queryRunner.query(`
      ALTER TABLE whatsapp_inbound_messages
      MODIFY statusProcessamento enum('RECEBIDA','PROCESSADA','IGNORADA_NAO_SUPORTADA','FALHA') NOT NULL DEFAULT 'RECEBIDA'
    `);
  }
}
