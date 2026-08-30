import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { DEFAULT_CATEGORIES } from '../categorias/default-categories';
import { Conta } from '../contas/entities/conta.entity';
import { Movimento } from '../movimentacoes/entities/movimento.entity';
import { Orcamento } from '../orcamentos/entities/orcamento.entity';
import { Reserva } from '../reservas/entities/reserva.entity';
import {
  AddEspacoMembroDto,
  CreateEspacoDto,
  EspacoContextoResponseDto,
  EspacoMembroResponseDto,
  EspacoResponseDto,
  EspacoVinculoResponseDto,
  TransferirPropriedadeDto,
  UpdateEspacoDto,
  UpdateEspacoMembroDto,
} from './dto/espaco.dto';
import { EspacoMembro, EspacoPapel } from './entities/espaco-membro.entity';
import { Espaco, EspacoTipo } from './entities/espaco.entity';

export interface EspacoContexto {
  espacoId: number;
  papel: EspacoPapel;
  espaco: Espaco;
}

@Injectable()
export class EspacosService {
  constructor(
    @InjectRepository(Espaco)
    private readonly espacosRepository: Repository<Espaco>,
    @InjectRepository(EspacoMembro)
    private readonly membrosRepository: Repository<EspacoMembro>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateEspacoDto,
    usuarioId: number,
    tipo = EspacoTipo.SHARED,
  ): Promise<EspacoResponseDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockUsers(manager, [usuarioId]);
        const ownedSpaces = await manager.count(Espaco, {
          where: { ownerUsuarioId: usuarioId },
        });
        if (ownedSpaces >= 10) {
          throw new ConflictException('Limite de 10 espaços próprios atingido');
        }

        const espaco = await manager.save(
          manager.create(Espaco, {
            nome: dto.nome,
            ownerUsuarioId: usuarioId,
            tipo,
          }),
        );
        await manager.save(
          manager.create(EspacoMembro, {
            espacoId: espaco.id,
            usuarioId,
            papel: EspacoPapel.OWNER,
          }),
        );
        await manager.save(
          DEFAULT_CATEGORIES.map((categoria) =>
            manager.create(Categoria, {
              ...categoria,
              usuarioId,
              espacoId: espaco.id,
            }),
          ),
        );
        return this.toEspacoResponse(espaco);
      });
    } catch (error) {
      this.throwNameConflict(error);
    }
  }

  async findAll(usuarioId: number): Promise<EspacoVinculoResponseDto[]> {
    const membros = await this.findMemberships(usuarioId);
    return membros.map((membro) => ({
      papel: membro.papel,
      espaco: this.toEspacoResponse(membro.espaco),
    }));
  }

  private findMemberships(usuarioId: number): Promise<EspacoMembro[]> {
    return this.membrosRepository.find({
      where: { usuarioId },
      relations: { espaco: true },
      order: { espaco: { nome: 'ASC' } },
    });
  }

  async resolveContext(
    espacoId: number | undefined,
    usuarioId: number,
    papeis?: EspacoPapel[],
  ): Promise<EspacoContexto> {
    let membro: EspacoMembro | null;
    if (espacoId === undefined) {
      const membros = await this.findMemberships(usuarioId);
      if (membros.length !== 1) {
        throw new BadRequestException('Informe o espacoId');
      }
      membro = membros[0];
    } else {
      membro = await this.membrosRepository.findOne({
        where: { espacoId, usuarioId },
        relations: { espaco: true },
      });
    }
    if (!membro) {
      throw new NotFoundException('Espaço não encontrado');
    }
    if (papeis && !papeis.includes(membro.papel)) {
      throw new ForbiddenException('Papel insuficiente neste espaço');
    }
    return {
      espacoId: membro.espacoId,
      papel: membro.papel,
      espaco: membro.espaco,
    };
  }

  async findOne(
    espacoId: number,
    usuarioId: number,
  ): Promise<EspacoContextoResponseDto> {
    const contexto = await this.resolveContext(espacoId, usuarioId);
    return {
      espacoId: contexto.espacoId,
      papel: contexto.papel,
      espaco: this.toEspacoResponse(contexto.espaco),
    };
  }

  async update(
    espacoId: number,
    dto: UpdateEspacoDto,
    usuarioId: number,
  ): Promise<EspacoResponseDto> {
    const { espaco } = await this.resolveContext(espacoId, usuarioId, [
      EspacoPapel.OWNER,
    ]);
    try {
      await this.espacosRepository.update(espacoId, dto);
      return this.toEspacoResponse({ ...espaco, ...dto } as Espaco);
    } catch (error) {
      this.throwNameConflict(error);
    }
  }

  async remove(espacoId: number, usuarioId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const espaco = await manager.findOne(Espaco, {
        where: { id: espacoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!espaco) {
        throw new NotFoundException('Espaço não encontrado');
      }
      const membro = await manager.findOne(EspacoMembro, {
        where: { espacoId, usuarioId },
      });
      if (!membro) {
        throw new NotFoundException('Espaço não encontrado');
      }
      if (membro.papel !== EspacoPapel.OWNER) {
        throw new ForbiddenException('Papel insuficiente neste espaço');
      }
      if (espaco.tipo === EspacoTipo.PERSONAL) {
        throw new BadRequestException('O espaço pessoal não pode ser excluído');
      }
      const memberCount = await manager.count(EspacoMembro, {
        where: { espacoId },
      });
      if (memberCount > 1) {
        throw new ConflictException(
          'Remova os membros adicionais antes de excluir o espaço',
        );
      }
      for (const entity of [Conta, Movimento, Categoria, Orcamento, Reserva]) {
        const count = await manager.count(entity, { where: { espacoId } });
        if (count > 0) {
          throw new ConflictException(
            'Esvazie contas, movimentações, categorias, orçamentos e reservas antes de excluir o espaço',
          );
        }
      }
      await manager.delete(EspacoMembro, { espacoId });
      await manager.delete(Espaco, { id: espacoId });
    });
  }

  async listMembers(
    espacoId: number,
    usuarioId: number,
  ): Promise<EspacoMembroResponseDto[]> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    const membros = await this.membrosRepository
      .createQueryBuilder('membro')
      .leftJoin('membro.usuario', 'usuario')
      .select([
        'membro.id',
        'membro.espacoId',
        'membro.usuarioId',
        'membro.papel',
        'membro.createdAt',
        'usuario.id',
        'usuario.nome',
        'usuario.email',
      ])
      .where('membro.espacoId = :espacoId', { espacoId })
      .orderBy('membro.createdAt', 'ASC')
      .getMany();
    return membros.map((membro) => this.toMembroResponse(membro));
  }

  async addMember(
    espacoId: number,
    dto: AddEspacoMembroDto,
    usuarioId: number,
  ): Promise<EspacoMembroResponseDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockEspacoAndRequireOwner(manager, espacoId, usuarioId);
        const usuario = await manager.findOne(Usuario, {
          where: { email: dto.email, ativo: true },
        });
        if (!usuario) {
          throw new NotFoundException('Não foi possível adicionar este usuário');
        }
        const existente = await manager.findOne(EspacoMembro, {
          where: { espacoId, usuarioId: usuario.id },
        });
        if (existente) {
          throw new ConflictException('Usuário já participa deste espaço');
        }
        const membro = await manager.save(
          manager.create(EspacoMembro, {
            espacoId,
            usuarioId: usuario.id,
            papel: dto.papel ?? EspacoPapel.VIEWER,
          }),
        );
        return this.toMembroResponse(membro);
      });
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Usuário já participa deste espaço');
      }
      throw error;
    }
  }

  async updateMember(
    espacoId: number,
    membroUsuarioId: number,
    dto: UpdateEspacoMembroDto,
    usuarioId: number,
  ): Promise<EspacoMembroResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockEspacoAndRequireOwner(manager, espacoId, usuarioId);
      const membro = await this.getMemberWithManager(
        manager,
        espacoId,
        membroUsuarioId,
      );
      if (membro.papel === EspacoPapel.OWNER) {
        throw new BadRequestException('Use a transferência de propriedade');
      }
      membro.papel = dto.papel;
      return this.toMembroResponse(await manager.save(membro));
    });
  }

  async removeMember(
    espacoId: number,
    membroUsuarioId: number,
    usuarioId: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.lockEspacoAndRequireOwner(manager, espacoId, usuarioId);
      const membro = await this.getMemberWithManager(
        manager,
        espacoId,
        membroUsuarioId,
      );
      if (membro.papel === EspacoPapel.OWNER) {
        throw new BadRequestException('Transfira a propriedade antes de sair');
      }
      await manager.delete(EspacoMembro, {
        espacoId,
        usuarioId: membroUsuarioId,
      });
    });
  }

  async leave(espacoId: number, usuarioId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const espaco = await manager.findOne(Espaco, {
        where: { id: espacoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!espaco) {
        throw new NotFoundException('Espaço não encontrado');
      }
      const membro = await manager.findOne(EspacoMembro, {
        where: { espacoId, usuarioId },
      });
      if (!membro) {
        throw new NotFoundException('Membro não encontrado');
      }
      if (membro.papel === EspacoPapel.OWNER) {
        throw new BadRequestException('Transfira a propriedade antes de sair');
      }
      await manager.delete(EspacoMembro, { espacoId, usuarioId });
    });
  }

  async transferOwnership(
    espacoId: number,
    dto: TransferirPropriedadeDto,
    usuarioId: number,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.lockUsers(manager, [usuarioId, dto.usuarioId]);
        const espaco = await manager.findOne(Espaco, {
          where: { id: espacoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!espaco) {
          throw new NotFoundException('Espaço não encontrado');
        }
        const ownerAtual = await manager.findOne(EspacoMembro, {
          where: { espacoId, usuarioId },
        });
        if (!ownerAtual) {
          throw new NotFoundException('Espaço não encontrado');
        }
        if (ownerAtual.papel !== EspacoPapel.OWNER) {
          throw new ForbiddenException('Papel insuficiente neste espaço');
        }
        const novoOwner = await manager.findOne(EspacoMembro, {
          where: { espacoId, usuarioId: dto.usuarioId },
        });
        if (!novoOwner) {
          throw new NotFoundException('Membro não encontrado');
        }
        if (novoOwner.papel === EspacoPapel.OWNER) {
          throw new BadRequestException('Usuário já é proprietário');
        }
        const ownedSpaces = await manager.count(Espaco, {
          where: { ownerUsuarioId: dto.usuarioId },
        });
        if (ownedSpaces >= 10) {
          throw new ConflictException(
            'Limite de 10 espaços próprios atingido pelo novo proprietário',
          );
        }
        await manager.update(Espaco, espacoId, {
          ownerUsuarioId: dto.usuarioId,
        });
        await manager.update(
          EspacoMembro,
          { espacoId, usuarioId },
          { papel: EspacoPapel.EDITOR },
        );
        await manager.update(
          EspacoMembro,
          { espacoId, usuarioId: dto.usuarioId },
          { papel: EspacoPapel.OWNER },
        );
      });
    } catch (error) {
      this.throwNameConflict(error);
    }
  }

  private async getMember(
    espacoId: number,
    usuarioId: number,
  ): Promise<EspacoMembro> {
    const membro = await this.membrosRepository.findOne({
      where: { espacoId, usuarioId },
    });
    if (!membro) {
      throw new NotFoundException('Membro não encontrado');
    }
    return membro;
  }

  private async getMemberWithManager(
    manager: EntityManager,
    espacoId: number,
    usuarioId: number,
  ): Promise<EspacoMembro> {
    const membro = await manager.findOne(EspacoMembro, {
      where: { espacoId, usuarioId },
    });
    if (!membro) {
      throw new NotFoundException('Membro não encontrado');
    }
    return membro;
  }

  private async lockEspacoAndRequireOwner(
    manager: EntityManager,
    espacoId: number,
    usuarioId: number,
  ): Promise<void> {
    const espaco = await manager.findOne(Espaco, {
      where: { id: espacoId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!espaco) {
      throw new NotFoundException('Espaço não encontrado');
    }
    const membro = await manager.findOne(EspacoMembro, {
      where: { espacoId, usuarioId },
    });
    if (!membro) {
      throw new NotFoundException('Espaço não encontrado');
    }
    if (membro.papel !== EspacoPapel.OWNER) {
      throw new ForbiddenException('Papel insuficiente neste espaço');
    }
  }

  private async lockUsers(
    manager: EntityManager,
    usuarioIds: number[],
  ): Promise<void> {
    for (const usuarioId of [...new Set(usuarioIds)].sort((a, b) => a - b)) {
      await manager
        .getRepository(Usuario)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :usuarioId', { usuarioId })
        .getOne();
    }
  }

  private throwNameConflict(error: unknown): never {
    if (this.isDuplicateEntry(error)) {
      throw new ConflictException(
        'Já existe um espaço com este nome para o proprietário',
      );
    }
    throw error;
  }

  private isDuplicateEntry(error: unknown): boolean {
    return (
      (error instanceof QueryFailedError || typeof error === 'object') &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    );
  }

  private toEspacoResponse(espaco: Espaco): EspacoResponseDto {
    return {
      id: espaco.id,
      nome: espaco.nome,
      tipo: espaco.tipo,
      ownerUsuarioId: espaco.ownerUsuarioId,
      ...(espaco.createdAt ? { createdAt: espaco.createdAt } : {}),
      ...(espaco.updatedAt ? { updatedAt: espaco.updatedAt } : {}),
    };
  }

  private toMembroResponse(membro: EspacoMembro): EspacoMembroResponseDto {
    return {
      usuarioId: membro.usuarioId,
      papel: membro.papel,
      ...(membro.usuario
        ? {
            usuario: {
              id: membro.usuario.id,
              nome: membro.usuario.nome,
              email: membro.usuario.email,
            },
          }
        : {}),
    };
  }
}
