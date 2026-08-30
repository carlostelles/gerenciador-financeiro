import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  AddEspacoMembroDto,
  CreateEspacoDto,
  TransferirPropriedadeDto,
  UpdateEspacoDto,
  UpdateEspacoMembroDto,
} from './dto/espaco.dto';
import { EspacoMembro, EspacoPapel } from './entities/espaco-membro.entity';
import { Espaco } from './entities/espaco.entity';

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

  async create(dto: CreateEspacoDto, usuarioId: number): Promise<Espaco> {
    return this.dataSource.transaction(async (manager) => {
      const espaco = await manager.save(
        manager.create(Espaco, {
          nome: dto.nome,
          ownerUsuarioId: usuarioId,
        }),
      );
      await manager.save(
        manager.create(EspacoMembro, {
          espacoId: espaco.id,
          usuarioId,
          papel: EspacoPapel.OWNER,
        }),
      );
      return espaco;
    });
  }

  async findAll(usuarioId: number): Promise<EspacoMembro[]> {
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
      const membros = await this.findAll(usuarioId);
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

  async findOne(espacoId: number, usuarioId: number): Promise<EspacoContexto> {
    return this.resolveContext(espacoId, usuarioId);
  }

  async update(
    espacoId: number,
    dto: UpdateEspacoDto,
    usuarioId: number,
  ): Promise<Espaco> {
    const { espaco } = await this.resolveContext(espacoId, usuarioId, [
      EspacoPapel.OWNER,
    ]);
    await this.espacosRepository.update(espacoId, dto);
    return { ...espaco, ...dto };
  }

  async remove(espacoId: number, usuarioId: number): Promise<void> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(EspacoMembro, { espacoId });
      await manager.delete(Espaco, { id: espacoId });
    });
  }

  async listMembers(
    espacoId: number,
    usuarioId: number,
  ): Promise<EspacoMembro[]> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    return this.membrosRepository
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
  }

  async addMember(
    espacoId: number,
    dto: AddEspacoMembroDto,
    usuarioId: number,
  ): Promise<EspacoMembro> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email, ativo: true },
    });
    if (!usuario) {
      throw new NotFoundException('Não foi possível adicionar este usuário');
    }
    const existente = await this.membrosRepository.findOne({
      where: { espacoId, usuarioId: usuario.id },
    });
    if (existente) {
      throw new ConflictException('Usuário já participa deste espaço');
    }
    return this.membrosRepository.save(
      this.membrosRepository.create({
        espacoId,
        usuarioId: usuario.id,
        papel: dto.papel ?? EspacoPapel.VIEWER,
      }),
    );
  }

  async updateMember(
    espacoId: number,
    membroUsuarioId: number,
    dto: UpdateEspacoMembroDto,
    usuarioId: number,
  ): Promise<EspacoMembro> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    const membro = await this.getMember(espacoId, membroUsuarioId);
    if (membro.papel === EspacoPapel.OWNER) {
      throw new BadRequestException('Use a transferência de propriedade');
    }
    membro.papel = dto.papel;
    return this.membrosRepository.save(membro);
  }

  async removeMember(
    espacoId: number,
    membroUsuarioId: number,
    usuarioId: number,
  ): Promise<void> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    const membro = await this.getMember(espacoId, membroUsuarioId);
    if (membro.papel === EspacoPapel.OWNER) {
      throw new BadRequestException('Transfira a propriedade antes de sair');
    }
    await this.membrosRepository.remove(membro);
  }

  async leave(espacoId: number, usuarioId: number): Promise<void> {
    const membro = await this.getMember(espacoId, usuarioId);
    if (membro.papel === EspacoPapel.OWNER) {
      throw new BadRequestException('Transfira a propriedade antes de sair');
    }
    await this.membrosRepository.remove(membro);
  }

  async transferOwnership(
    espacoId: number,
    dto: TransferirPropriedadeDto,
    usuarioId: number,
  ): Promise<void> {
    await this.resolveContext(espacoId, usuarioId, [EspacoPapel.OWNER]);
    const novoOwner = await this.getMember(espacoId, dto.usuarioId);
    if (novoOwner.papel === EspacoPapel.OWNER) {
      throw new BadRequestException('Usuário já é proprietário');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Espaco, espacoId, { ownerUsuarioId: dto.usuarioId });
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
}
