import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { LogsService } from '../logs/logs.service';
import { CategoriaTipo, LogAcao } from '../../common/types';
import { EspacosService } from '../espacos/espacos.service';
import { DEFAULT_CATEGORIES } from './default-categories';
import { EspacoPapel } from '../espacos/entities/espaco-membro.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
    private logsService: LogsService,
    @Optional() private espacosService?: EspacosService,
  ) {}

  async create(
    createCategoriaDto: CreateCategoriaDto,
    currentUser: any,
    espacoId?: number,
  ): Promise<Categoria> {
    const contexto = await this.contexto(currentUser.sub, espacoId, true);
    // Verificar se já existe categoria com mesmo nome e tipo para o usuário
    const existingCategoria = await this.categoriasRepository.findOne({
      where: {
        ...(contexto ? { espacoId: contexto } : { usuarioId: currentUser.sub }),
        nome: createCategoriaDto.nome,
        tipo: createCategoriaDto.tipo,
      },
    });

    if (existingCategoria) {
      throw new ConflictException(
        'Já existe uma categoria com este nome e tipo',
      );
    }

    const categoria = this.categoriasRepository.create({
      ...createCategoriaDto,
      usuarioId: currentUser.sub,
      ...(contexto ? { espacoId: contexto } : {}),
    });

    const savedCategoria = await this.categoriasRepository.save(categoria);

    // Log da criação
    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Categoria criada: ${savedCategoria.nome}`,
      acao: LogAcao.CREATE,
      entidade: 'Categoria',
      entidadeId: savedCategoria.id.toString(),
      dadosNovos: savedCategoria,
    });

    return savedCategoria;
  }

  async findAll(currentUser: any, espacoId?: number): Promise<Categoria[]> {
    const contexto = await this.contexto(currentUser.sub, espacoId);
    return this.categoriasRepository.find({
      where: contexto ? { espacoId: contexto } : { usuarioId: currentUser.sub },
      order: { nome: 'ASC' },
    });
  }

  async findOne(
    id: number,
    currentUser: any,
    espacoId?: number,
    escrita = false,
  ): Promise<Categoria> {
    const contexto = await this.contexto(currentUser.sub, espacoId, escrita);
    const categoria = await this.categoriasRepository.findOne({
      where: contexto
        ? { id, espacoId: contexto }
        : { id, usuarioId: currentUser.sub },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return categoria;
  }

  async update(
    id: number,
    updateCategoriaDto: UpdateCategoriaDto,
    currentUser: any,
    espacoId?: number,
  ): Promise<Categoria> {
    const categoria = await this.findOne(id, currentUser, espacoId, true);

    // Verificar se já existe categoria com mesmo nome e tipo para o usuário
    if (updateCategoriaDto.nome || updateCategoriaDto.tipo) {
      const existingCategoria = await this.categoriasRepository.findOne({
        where: {
          ...(categoria.espacoId
            ? { espacoId: categoria.espacoId }
            : { usuarioId: currentUser.sub }),
          nome: updateCategoriaDto.nome || categoria.nome,
          tipo: updateCategoriaDto.tipo || categoria.tipo,
          id: { $ne: id } as any,
        },
      });

      if (existingCategoria) {
        throw new ConflictException(
          'Já existe uma categoria com este nome e tipo',
        );
      }
    }

    const dadosAnteriores = { ...categoria };
    await this.categoriasRepository.update(id, updateCategoriaDto);
    const categoriaAtualizada = await this.findOne(id, currentUser, espacoId);

    // Log da atualização
    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Categoria atualizada: ${categoriaAtualizada.nome}`,
      acao: LogAcao.UPDATE,
      entidade: 'Categoria',
      entidadeId: id.toString(),
      dadosAnteriores,
      dadosNovos: categoriaAtualizada,
    });

    return categoriaAtualizada;
  }

  async remove(id: number, currentUser: any, espacoId?: number): Promise<void> {
    const categoria = await this.findOne(id, currentUser, espacoId, true);

    // Verificar se a categoria está sendo usada
    const isInUse = await this.categoriasRepository
      .createQueryBuilder('categoria')
      .leftJoin('categoria.orcamentoItems', 'orcamentoItems')
      .leftJoin('categoria.reservas', 'reservas')
      .where('categoria.id = :id', { id })
      .andWhere('(orcamentoItems.id IS NOT NULL OR reservas.id IS NOT NULL)')
      .getCount();

    if (isInUse > 0) {
      throw new ConflictException(
        'Categoria não pode ser excluída pois está sendo utilizada',
      );
    }

    await this.categoriasRepository.remove(categoria);

    // Log da exclusão
    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Categoria excluída: ${categoria.nome}`,
      acao: LogAcao.DELETE,
      entidade: 'Categoria',
      entidadeId: id.toString(),
      dadosAnteriores: categoria,
    });
  }

  /**
   * Cria as categorias padrões para um novo usuário.
   * Chamado automaticamente após o cadastro do usuário.
   */
  async createDefaultCategories(
    usuarioId: number,
    espacoId?: number,
  ): Promise<Categoria[]> {
    const categorias = DEFAULT_CATEGORIES.map((cat) =>
      this.categoriasRepository.create({
        ...cat,
        usuarioId,
        espacoId,
      }),
    );

    const savedCategorias = await this.categoriasRepository.save(categorias);

    // Log da criação em lote
    await this.logsService.create({
      data: new Date(),
      usuarioId,
      descricao: `Categorias padrões criadas para o usuário ${usuarioId}`,
      acao: LogAcao.CREATE,
      entidade: 'Categoria',
      entidadeId: savedCategorias.map((c) => c.id).join(','),
      dadosNovos: savedCategorias,
    });

    return savedCategorias;
  }

  private async contexto(
    usuarioId: number,
    espacoId?: number,
    escrita = false,
  ): Promise<number | undefined> {
    if (!this.espacosService) return undefined;
    const contexto = await this.espacosService.resolveContext(
      espacoId,
      usuarioId,
      escrita ? [EspacoPapel.OWNER, EspacoPapel.EDITOR] : undefined,
    );
    return contexto.espacoId;
  }
}
