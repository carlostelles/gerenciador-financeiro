import * as bcrypt from 'bcrypt';

describe('bcrypt compatibility', () => {
  const legacyHash =
    '$2b$10$9jIqrCuTOs0VIJvjtFsyGupjSBqEk3ZhY3AnajMIqMLsyhiVmKBgS';

  it('deve validar hashes gerados pela versão anterior', async () => {
    await expect(
      bcrypt.compare('senha-legada-123', legacyHash),
    ).resolves.toBe(true);
    await expect(
      bcrypt.compare('senha-incorreta', legacyHash),
    ).resolves.toBe(false);
  });

  it('deve gerar hashes compatíveis com a API existente', async () => {
    const hash = await bcrypt.hash('senha-nova-456', 10);

    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    await expect(bcrypt.compare('senha-nova-456', hash)).resolves.toBe(true);
  });
});