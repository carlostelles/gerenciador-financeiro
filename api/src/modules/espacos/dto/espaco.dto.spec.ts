import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AddEspacoMembroDto,
  CreateEspacoDto,
  UpdateEspacoMembroDto,
} from './espaco.dto';
import { EspacoPapel } from '../entities/espaco-membro.entity';

describe('DTOs do espaço', () => {
  it('remove espaços nas extremidades do nome', async () => {
    const dto = plainToInstance(CreateEspacoDto, {
      nome: '  Família  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.nome).toBe('Família');
  });

  it('rejeita nome vazio após normalização', async () => {
    const dto = plainToInstance(CreateEspacoDto, { nome: '   ' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('aceita nome normalizado com exatamente 120 caracteres', async () => {
    const dto = plainToInstance(CreateEspacoDto, {
      nome: ` ${'a'.repeat(120)} `,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.nome).toHaveLength(120);
  });
});

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
