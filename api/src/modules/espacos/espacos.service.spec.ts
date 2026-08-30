import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { EspacosService } from './espacos.service';
import { Espaco } from './entities/espaco.entity';
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
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(transactionalManager)),
  } as unknown as jest.Mocked<DataSource>;
  let service: EspacosService;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('remove os vínculos antes de excluir o espaço', async () => {
    membrosRepository.findOne.mockResolvedValue({
      espacoId: 10,
      usuarioId: 1,
      papel: EspacoPapel.OWNER,
      espaco: { id: 10 },
    } as EspacoMembro);

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

  it('usa resposta neutra ao incluir email inexistente ou inativo', async () => {
    usuariosRepository.findOne.mockResolvedValue(null);
    membrosRepository.findOne.mockResolvedValue({
      papel: EspacoPapel.OWNER,
    } as EspacoMembro);

    await expect(
      service.addMember(10, { email: 'ausente@example.com' }, 1),
    ).rejects.toThrow('Não foi possível adicionar este usuário');
  });

  it('transfere propriedade trocando os dois papéis em uma transação', async () => {
    membrosRepository.findOne
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
});
