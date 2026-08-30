import { validate } from 'class-validator';

import { AddEspacoMembroDto, UpdateEspacoMembroDto } from './espaco.dto';
import { EspacoPapel } from '../entities/espaco-membro.entity';

describe('DTOs de membros do espaço', () => {
  it.each([EspacoPapel.EDITOR, EspacoPapel.VIEWER])(
    'aceita o papel %s',
    async (papel) => {
      const dto = Object.assign(new AddEspacoMembroDto(), {
        email: 'pessoa@example.com',
        papel,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rejeita OWNER na inclusão de membro', async () => {
    const dto = Object.assign(new AddEspacoMembroDto(), {
      email: 'pessoa@example.com',
      papel: EspacoPapel.OWNER,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejeita OWNER na alteração de papel', async () => {
    const dto = Object.assign(new UpdateEspacoMembroDto(), {
      papel: EspacoPapel.OWNER,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});