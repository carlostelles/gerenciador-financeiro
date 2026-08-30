import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWhatsappIntegration1798588800000
  implements MigrationInterface
{
  name = 'RemoveWhatsappIntegration1798588800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'whatsapp_inbound_checkpoints',
      'whatsapp_inbound_results',
      'whatsapp_inbound_jobs',
      'whatsapp_inbound_messages',
      'whatsapp_webhook_events',
      'whatsapp_envios',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }

    await this.dropColumnIfPresent(
      queryRunner,
      'movimentos',
      'idempotencyKey',
    );
    await this.dropColumnIfPresent(
      queryRunner,
      'movimento_comprovantes',
      'idempotencyKey',
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'A remoção da integração WhatsApp é irreversível porque exclui dados operacionais.',
    );
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