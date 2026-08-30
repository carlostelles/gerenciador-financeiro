import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { EspacosService } from './espacos.service';
import { Espaco, EspacoTipo } from './entities/espaco.entity';
import { EspacoMembro, EspacoPapel } from './entities/espaco-membro.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

describe('EspacosService', () => {
  const espacosRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<Espaco>>;
  const membrosRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<EspacoMembro>>;
  const usuariosRepository = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Usuario>>;
  const transactionalManager = {
    create: jest.fn((_entity, value) => value),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    getRepository: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(transactionalManager)),
  } as unknown as jest.Mocked<DataSource>;
  let service: EspacosService;

  beforeEach(() => {
    jest.clearAllMocks();
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 1 }),
    };
    transactionalManager.getRepository.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    });
    transactionalManager.count.mockResolvedValue(0);
    transactionalManager.findOne.mockResolvedValue(null);
    service = new EspacosService(
      espacosRepository,
      membrosRepository,
      usuariosRepository,
      dataSource,
    );
  });

  it('cria espaço e exatamente um vínculo OWNER na mesma transação', async () => {
    transactionalManager.save
      .mockResolvedValueOnce({
        id: 10,
        nome: 'Família',
        ownerUsuarioId: 1,
      } as Espaco)
      .mockResolvedValueOnce({} as EspacoMembro);

    const result = await service.create({ nome: 'Família' }, 1);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalManager.create).toHaveBeenNthCalledWith(1, Espaco, {
      nome: 'Família',
      ownerUsuarioId: 1,
      tipo: EspacoTipo.SHARED,
    });
    expect(transactionalManager.create).toHaveBeenNthCalledWith(
      2,
      EspacoMembro,
      {
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      },
    );
    expect(result.id).toBe(10);
  });

  it('cria categorias padrão dentro da mesma transação do espaço', async () => {
    transactionalManager.save
      .mockResolvedValueOnce({
        id: 10,
        nome: 'Família',
        ownerUsuarioId: 1,
      } as Espaco)
      .mockResolvedValueOnce({} as EspacoMembro)
      .mockResolvedValueOnce([]);

    await service.create({ nome: 'Família' }, 1);

    expect(transactionalManager.save).toHaveBeenCalledTimes(3);
    expect(transactionalManager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ usuarioId: 1, espacoId: 10 }),
    );
  });

  it('rejeita o décimo primeiro espaço próprio', async () => {
    transactionalManager.count.mockResolvedValueOnce(10);

    await expect(service.create({ nome: 'Outro' }, 1)).rejects.toThrow(
      'Limite de 10 espaços próprios atingido',
    );
  });

  it('traduz violação do índice de nome por owner em conflito', async () => {
    transactionalManager.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

    await expect(service.create({ nome: 'família' }, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('resolve automaticamente o único espaço do usuário', async () => {
    membrosRepository.find.mockResolvedValue([
      {
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.EDITOR,
        espaco: { id: 10, nome: 'Família' },
      } as EspacoMembro,
    ]);

    await expect(service.resolveContext(undefined, 1)).resolves.toMatchObject({
      espacoId: 10,
      papel: EspacoPapel.EDITOR,
    });
  });

  it('lista espaços por DTO sem expor metadados internos do vínculo', async () => {
    membrosRepository.find.mockResolvedValue([
      {
        id: 55,
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
        createdAt: new Date(),
        espaco: {
          id: 10,
          nome: 'Família',
          tipo: EspacoTipo.SHARED,
          ownerUsuarioId: 1,
        },
      } as EspacoMembro,
    ]);

    const result = await service.findAll(1);

    expect(result).toEqual([
      {
        papel: EspacoPapel.OWNER,
        espaco: {
          id: 10,
          nome: 'Família',
          tipo: EspacoTipo.SHARED,
          ownerUsuarioId: 1,
        },
      },
    ]);
    expect(result[0]).not.toHaveProperty('usuarioId');
  });

  it('exige espacoId quando o usuário participa de múltiplos espaços', async () => {
    membrosRepository.find.mockResolvedValue([
      { espacoId: 10 } as EspacoMembro,
      { espacoId: 11 } as EspacoMembro,
    ]);

    await expect(service.resolveContext(undefined, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retorna 404 para espaço inexistente ou fora do acesso do usuário', async () => {
    membrosRepository.findOne.mockResolvedValue(null);

    await expect(service.resolveContext(99, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retorna 403 quando VIEWER tenta escrever em espaço conhecido', async () => {
    membrosRepository.findOne.mockResolvedValue({
      espacoId: 10,
      usuarioId: 1,
      papel: EspacoPapel.VIEWER,
      espaco: { id: 10 },
    } as EspacoMembro);

    await expect(
      service.resolveContext(10, 1, [EspacoPapel.OWNER, EspacoPapel.EDITOR]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('não expõe a lista de membros para VIEWER', async () => {
    membrosRepository.findOne.mockResolvedValue({
      espacoId: 10,
      usuarioId: 1,
      papel: EspacoPapel.VIEWER,
      espaco: { id: 10 },
    } as EspacoMembro);

    await expect(service.listMembers(10, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('remove o único vínculo antes de excluir espaço SHARED vazio', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      });
    transactionalManager.count.mockResolvedValueOnce(1);

    await service.remove(10, 1);

    expect(transactionalManager.delete).toHaveBeenNthCalledWith(
      1,
      EspacoMembro,
      { espacoId: 10 },
    );
    expect(transactionalManager.delete).toHaveBeenNthCalledWith(2, Espaco, {
      id: 10,
    });
  });

  it('não exclui espaço PERSONAL', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.PERSONAL })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      });

    await expect(service.remove(10, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('bloqueia exclusão quando existe membro adicional', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      });
    transactionalManager.count.mockResolvedValueOnce(2);

    await expect(service.remove(10, 1)).rejects.toThrow(
      'Remova os membros adicionais',
    );
  });

  it('bloqueia exclusão quando existe qualquer dado financeiro', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      });
    transactionalManager.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(service.remove(10, 1)).rejects.toThrow(
      'Esvazie contas, movimentações, categorias, orçamentos e reservas',
    );
  });

  it('usa resposta neutra ao incluir email inexistente ou inativo', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({ papel: EspacoPapel.OWNER })
      .mockResolvedValueOnce(null);

    await expect(
      service.addMember(10, { email: 'ausente@example.com' }, 1),
    ).rejects.toThrow('Não foi possível adicionar este usuário');
  });

  it('revalida o OWNER dentro da transação antes de incluir membro', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({ papel: EspacoPapel.EDITOR });

    await expect(
      service.addMember(10, { email: 'pessoa@example.com' }, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transactionalManager.save).not.toHaveBeenCalled();
  });

  it('traduz inclusão concorrente do mesmo membro em conflito', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({ papel: EspacoPapel.OWNER })
      .mockResolvedValueOnce({ id: 2, ativo: true })
      .mockResolvedValueOnce(null);
    transactionalManager.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

    await expect(
      service.addMember(10, { email: 'pessoa@example.com' }, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('transfere propriedade trocando os dois papéis em uma transação', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({
        id: 10,
        tipo: EspacoTipo.SHARED,
      })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      } as EspacoMembro)
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 2,
        papel: EspacoPapel.EDITOR,
      } as EspacoMembro);

    await service.transferOwnership(10, { usuarioId: 2 }, 1);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalManager.update).toHaveBeenNthCalledWith(1, Espaco, 10, {
      ownerUsuarioId: 2,
    });
    expect(transactionalManager.update).toHaveBeenNthCalledWith(
      2,
      EspacoMembro,
      { espacoId: 10, usuarioId: 1 },
      { papel: EspacoPapel.EDITOR },
    );
    expect(transactionalManager.update).toHaveBeenNthCalledWith(
      3,
      EspacoMembro,
      { espacoId: 10, usuarioId: 2 },
      { papel: EspacoPapel.OWNER },
    );
  });

  it('impede transferência para usuário que já possui dez espaços', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({
        id: 10,
        tipo: EspacoTipo.SHARED,
      })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      } as EspacoMembro)
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 2,
        papel: EspacoPapel.EDITOR,
      } as EspacoMembro);
    transactionalManager.count.mockResolvedValueOnce(10);

    await expect(
      service.transferOwnership(10, { usuarioId: 2 }, 1),
    ).rejects.toThrow('Limite de 10 espaços próprios atingido');
  });

  it('traduz conflito de nome durante transferência', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({
        id: 10,
        tipo: EspacoTipo.SHARED,
      })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.OWNER,
      } as EspacoMembro)
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 2,
        papel: EspacoPapel.EDITOR,
      } as EspacoMembro);
    transactionalManager.update.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

    await expect(
      service.transferOwnership(10, { usuarioId: 2 }, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('revalida o OWNER dentro da transação antes de transferir', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.EDITOR,
      });

    await expect(
      service.transferOwnership(10, { usuarioId: 2 }, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transactionalManager.update).not.toHaveBeenCalled();
  });

  it('revalida o OWNER dentro da transação antes de excluir', async () => {
    transactionalManager.findOne
      .mockResolvedValueOnce({ id: 10, tipo: EspacoTipo.SHARED })
      .mockResolvedValueOnce({
        espacoId: 10,
        usuarioId: 1,
        papel: EspacoPapel.EDITOR,
      });

    await expect(service.remove(10, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(transactionalManager.delete).not.toHaveBeenCalled();
  });
});
