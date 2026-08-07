import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWhatsappInboundMessages1786060800000 implements MigrationInterface {
  name = 'CreateWhatsappInboundMessages1786060800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
        id int NOT NULL AUTO_INCREMENT,
        usuarioId int NULL,
        telefoneOrigem varchar(20) NOT NULL,
        providerMessageId varchar(120) NOT NULL,
        tipoMensagem enum('TEXT','IMAGE','DOCUMENT','AUDIO','UNSUPPORTED') NOT NULL,
        intentDetectada enum('NOVA_MOVIMENTACAO','EXTRATO','COMPROVANTE','DESCONHECIDA') NOT NULL DEFAULT 'DESCONHECIDA',
        statusProcessamento enum('RECEBIDA','PROCESSADA','IGNORADA_NAO_SUPORTADA','FALHA') NOT NULL DEFAULT 'RECEBIDA',
        mediaId varchar(120) NULL,
        mimeType varchar(255) NULL,
        nomeArquivo varchar(255) NULL,
        movimentoId int NULL,
        periodoReferencia varchar(7) NULL,
        texto longtext NULL,
        erroProcessamento varchar(500) NULL,
        detalhesProcessamento json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_whatsapp_inbound_messages_providerMessageId (providerMessageId),
        KEY IDX_whatsapp_inbound_messages_usuario (usuarioId),
        KEY IDX_whatsapp_inbound_messages_status (statusProcessamento),
        KEY IDX_whatsapp_inbound_messages_movimento (movimentoId),
        CONSTRAINT FK_whatsapp_inbound_messages_usuario FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT FK_whatsapp_inbound_messages_movimento FOREIGN KEY (movimentoId) REFERENCES movimentos(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS whatsapp_inbound_messages;');
  }
}
