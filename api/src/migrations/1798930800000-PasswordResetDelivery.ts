import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetDelivery1798930800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE recuperacao_envios (
      id char(36) NOT NULL PRIMARY KEY,
      recuperacaoId int NOT NULL,
      status enum('pending','leased','dispatching','accepted','failed','cancelled','expired','unknown') NOT NULL DEFAULT 'pending',
      createdAt datetime(3) NOT NULL, availableAt datetime(3) NOT NULL, completedAt datetime(3) NULL,
      attempts int UNSIGNED NOT NULL DEFAULT 0,
      leaseOwner char(36) NULL, leaseVersion int UNSIGNED NOT NULL DEFAULT 0, leaseUntil datetime(3) NULL,
      dispatchStartedAt datetime(3) NULL, dispatchDeadlineAt datetime(3) NULL,
      payloadVersion tinyint UNSIGNED NOT NULL DEFAULT 1, keyId varchar(64) NULL,
      nonce binary(12) NULL, authTag binary(16) NULL, ciphertext blob NULL,
      lastErrorCode enum('preparation','key_unavailable','payload_invalid','rejected','uncertain','invalidated','ttl') NULL,
      UNIQUE KEY UQ_delivery_reset (recuperacaoId),
      KEY IDX_delivery_available (status,availableAt,id),
      KEY IDX_delivery_lease (status,leaseUntil),
      KEY IDX_delivery_completed (status,completedAt),
      CONSTRAINT CK_delivery_envelope CHECK (
        (status IN ('pending','leased') AND keyId IS NOT NULL AND nonce IS NOT NULL AND authTag IS NOT NULL AND ciphertext IS NOT NULL)
        OR (status NOT IN ('pending','leased') AND keyId IS NULL AND nonce IS NULL AND authTag IS NULL AND ciphertext IS NULL)
      ),
      CONSTRAINT FK_delivery_reset FOREIGN KEY (recuperacaoId) REFERENCES recuperacoes_senha(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE recuperacao_envios');
  }
}
