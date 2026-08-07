import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWhatsappTables1722988800000 implements MigrationInterface {
  name = 'CreateWhatsappTables1722988800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_envios (
        id int NOT NULL AUTO_INCREMENT,
        usuarioId int NOT NULL,
        telefoneDestino varchar(20) NOT NULL,
        tipo enum('COMPROVANTE_MOVIMENTACAO','COMPROVANTE_RESUMO','EXTRATO_TEXTO','EXTRATO_PDF','RESPOSTA_INBOUND') NOT NULL,
        status enum('QUEUED','SENDING','SENT','DELIVERED','READ','FAILED') NOT NULL DEFAULT 'QUEUED',
        idempotencyKey varchar(120) NOT NULL,
        providerMessageId varchar(120) NULL,
        movimentoId int NULL,
        periodoInicio varchar(7) NULL,
        periodoFim varchar(7) NULL,
        tentativas int NOT NULL DEFAULT 0,
        proximaTentativaEm datetime NULL,
        ultimoErro varchar(500) NULL,
        mensagem longtext NULL,
        payload json NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_whatsapp_envios_idempotency (idempotencyKey),
        KEY IDX_whatsapp_envios_usuario (usuarioId),
        KEY IDX_whatsapp_envios_status (status),
        KEY IDX_whatsapp_envios_providerMessageId (providerMessageId),
        KEY IDX_whatsapp_envios_movimentoId (movimentoId),
        CONSTRAINT FK_whatsapp_envios_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT FK_whatsapp_envios_movimento FOREIGN KEY (movimentoId) REFERENCES movimentos(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
        id int NOT NULL AUTO_INCREMENT,
        idempotencyKey varchar(120) NOT NULL,
        tipo varchar(40) NOT NULL,
        providerMessageId varchar(120) NULL,
        payload json NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_whatsapp_webhook_events_idempotency (idempotencyKey),
        KEY IDX_whatsapp_webhook_events_providerMessageId (providerMessageId),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS whatsapp_webhook_events;');
    await queryRunner.query('DROP TABLE IF EXISTS whatsapp_envios;');
  }
}
