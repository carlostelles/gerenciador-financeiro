import { QueryRunner } from 'typeorm';

import { RemoveWhatsappIntegration1798588800000 } from './1798588800000-remove-whatsapp-integration';

describe('RemoveWhatsappIntegration1798588800000', () => {
  it('remove tabelas em ordem segura e campos exclusivos da integração', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const dropColumn = jest.fn().mockResolvedValue(undefined);
    const getTable = jest.fn().mockResolvedValue({
      findColumnByName: jest.fn().mockReturnValue({}),
    });
    const queryRunner = {
      query,
      getTable,
      dropColumn,
    } as unknown as QueryRunner;

    await new RemoveWhatsappIntegration1798588800000().up(queryRunner);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'DROP TABLE IF EXISTS `whatsapp_inbound_checkpoints`',
      'DROP TABLE IF EXISTS `whatsapp_inbound_results`',
      'DROP TABLE IF EXISTS `whatsapp_inbound_jobs`',
      'DROP TABLE IF EXISTS `whatsapp_inbound_messages`',
      'DROP TABLE IF EXISTS `whatsapp_webhook_events`',
      'DROP TABLE IF EXISTS `whatsapp_envios`',
    ]);
    expect(dropColumn.mock.calls).toEqual([
      ['movimentos', 'idempotencyKey'],
      ['movimento_comprovantes', 'idempotencyKey'],
    ]);
  });

  it('não tenta remover colunas ausentes', async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      getTable: jest.fn().mockResolvedValue({
        findColumnByName: jest.fn().mockReturnValue(undefined),
      }),
      dropColumn: jest.fn(),
    } as unknown as QueryRunner;

    await new RemoveWhatsappIntegration1798588800000().up(queryRunner);

    expect(queryRunner.dropColumn).not.toHaveBeenCalled();
  });

  it('impede rollback silencioso de dados removidos', async () => {
    await expect(
      new RemoveWhatsappIntegration1798588800000().down(),
    ).rejects.toThrow('irreversível');
  });
});