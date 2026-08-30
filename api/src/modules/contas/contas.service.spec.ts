import { ForbiddenException } from '@nestjs/common';

import { EspacoPapel } from '../espacos/entities/espaco-membro.entity';
import { EspacosService } from '../espacos/espacos.service';
import { ContasService } from './contas.service';

describe('ContasService com espaço financeiro', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 3, ...value })),
    find: jest.fn(),
  } as any;
  const movimentos = {} as any;
  const logs = { create: jest.fn() } as any;
  const espacos = { resolveContext: jest.fn() } as unknown as jest.Mocked<EspacosService>;
  let service: ContasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContasService(repository, movimentos, logs, espacos);
  });

  it('EDITOR cria conta no espaço mantendo a autoria', async () => {
    espacos.resolveContext.mockResolvedValue({
      espacoId: 8,
      papel: EspacoPapel.EDITOR,
    } as any);

    await service.create({ nome: 'Conjunta' }, { sub: 2 }, 8);

    expect(repository.create).toHaveBeenCalledWith({
      nome: 'Conjunta',
      usuarioId: 2,
      espacoId: 8,
    });
    expect(espacos.resolveContext).toHaveBeenCalledWith(8, 2, [
      EspacoPapel.OWNER,
      EspacoPapel.EDITOR,
    ]);
  });

  it('VIEWER não cria conta', async () => {
    espacos.resolveContext.mockRejectedValue(new ForbiddenException());

    await expect(
      service.create({ nome: 'Bloqueada' }, { sub: 3 }, 8),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('lista contas somente do espaço resolvido', async () => {
    espacos.resolveContext.mockResolvedValue({
      espacoId: 8,
      papel: EspacoPapel.VIEWER,
    } as any);
    repository.find.mockResolvedValue([]);

    await service.findAll({ sub: 3 }, 8);

    expect(repository.find).toHaveBeenCalledWith({
      where: { espacoId: 8 },
      order: { nome: 'ASC' },
    });
  });
});