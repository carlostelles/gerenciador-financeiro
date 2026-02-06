import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { LogsService } from '../logs/logs.service';
import { CategoriaTipo, LogAcao } from '../../common/types';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
    private logsService: LogsService,
  ) {}

  async create(
    createCategoriaDto: CreateCategoriaDto,
    currentUser: any,
  ): Promise<Categoria> {
    // Verificar se já existe categoria com mesmo nome e tipo para o usuário
    const existingCategoria = await this.categoriasRepository.findOne({
      where: {
        usuarioId: currentUser.sub,
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

  async findAll(currentUser: any): Promise<Categoria[]> {
    return this.categoriasRepository.find({
      where: { usuarioId: currentUser.sub },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: number, currentUser: any): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id, usuarioId: currentUser.sub },
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
  ): Promise<Categoria> {
    const categoria = await this.findOne(id, currentUser);

    // Verificar se já existe categoria com mesmo nome e tipo para o usuário
    if (updateCategoriaDto.nome || updateCategoriaDto.tipo) {
      const existingCategoria = await this.categoriasRepository.findOne({
        where: {
          usuarioId: currentUser.sub,
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
    const categoriaAtualizada = await this.findOne(id, currentUser);

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

  async remove(id: number, currentUser: any): Promise<void> {
    const categoria = await this.findOne(id, currentUser);

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
  async createDefaultCategories(usuarioId: number): Promise<Categoria[]> {
    const defaultCategories: { nome: string; descricao: string; tipo: CategoriaTipo }[] = [
      { nome: 'Moradia', descricao: 'Habitação, aluguel, condomínio e manutenção', tipo: CategoriaTipo.DESPESA },
      { nome: 'Contas de Consumo', descricao: 'Utilidades como água, luz, gás e internet', tipo: CategoriaTipo.DESPESA },
      { nome: 'Alimentação', descricao: 'Supermercado, restaurantes e lanches', tipo: CategoriaTipo.DESPESA },
      { nome: 'Transporte', descricao: 'Combustível, transporte público e aplicativos', tipo: CategoriaTipo.DESPESA },
      { nome: 'Saúde e Bem-Estar', descricao: 'Plano de saúde, medicamentos e academia', tipo: CategoriaTipo.DESPESA },
      { nome: 'Educação', descricao: 'Cursos, livros e materiais de estudo', tipo: CategoriaTipo.DESPESA },
      { nome: 'Lazer e Entretenimento', descricao: 'Cinema, viagens, hobbies e diversão', tipo: CategoriaTipo.DESPESA },
      { nome: 'Dívidas', descricao: 'Empréstimos, financiamentos e parcelamentos', tipo: CategoriaTipo.DESPESA },
      { nome: 'Cartão de crédito', descricao: 'Fatura do cartão de crédito', tipo: CategoriaTipo.DESPESA },
      { nome: 'Assinaturas', descricao: 'Serviços de streaming, aplicativos e assinaturas recorrentes', tipo: CategoriaTipo.DESPESA },
      { nome: 'Impostos', descricao: 'Impostos e taxas diversas', tipo: CategoriaTipo.DESPESA },
      { nome: 'Salário', descricao: 'Rendimentos do trabalho e salário mensal', tipo: CategoriaTipo.RECEITA },
      { nome: 'Investimentos', descricao: 'Reservas e aplicações financeiras', tipo: CategoriaTipo.RESERVA },
    ];

    const categorias = defaultCategories.map((cat) =>
      this.categoriasRepository.create({
        ...cat,
        usuarioId,
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
}