import { getMetadataArgsStorage } from 'typeorm';

import { Movimento } from './movimento.entity';

describe('Movimento entity', () => {
  it('declara o índice que sustenta a chave estrangeira de comprovante', () => {
    const indice = getMetadataArgsStorage().indices.find(
      (item) =>
        item.target === Movimento &&
        item.name === 'IDX_movimentos_comprovanteId',
    );

    expect(indice).toBeDefined();
    expect(indice?.columns).toEqual(['comprovanteId']);
  });
});