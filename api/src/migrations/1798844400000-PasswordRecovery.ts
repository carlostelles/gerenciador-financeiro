import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordRecovery1798844400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `usuarios` ADD `credenciaisVersao` int UNSIGNED NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'CREATE TABLE `recuperacao_limites` (`emailDigest` char(64) NOT NULL, `admissions` json NOT NULL, PRIMARY KEY (`emailDigest`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE `recuperacoes_senha` (`id` int NOT NULL AUTO_INCREMENT, `usuarioId` int NOT NULL, `digest` char(64) NOT NULL, `issuedAt` datetime(3) NOT NULL, `expiresAt` datetime(3) NOT NULL, `consumedAt` datetime(3) NULL, `revokedAt` datetime(3) NULL, `credenciaisVersao` int UNSIGNED NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY `UQ_reset_digest` (`digest`), KEY `IDX_reset_usuario_revoked` (`usuarioId`, `revokedAt`), CONSTRAINT `FK_reset_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `recuperacoes_senha`');
    await queryRunner.query('DROP TABLE `recuperacao_limites`');
    await queryRunner.query(
      'ALTER TABLE `usuarios` DROP COLUMN `credenciaisVersao`',
    );
  }
}
