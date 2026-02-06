import { Categoria } from "./categoria.interface";
import { OrcamentoItem } from "./orcamento.interface";

export interface Movimento {
  id: number;
  usuarioId: number;
  periodo: string;
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId?: number;
  orcamentoItem?: OrcamentoItem;
  categoriaId?: number;
  categoria?: Categoria;
}

export interface CreateMovimentoDto {
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId?: number;
  categoriaId?: number;
}

export interface UpdateMovimentoDto {
  data?: string;
  descricao?: string;
  valor?: number;
  orcamentoItemId?: number;
  categoriaId?: number;
}

/** Item vindo do orçamento */
export interface CategoriaOrcamentoOption {
  orcamentoItemId: number;
  descricao: string;
  valor: number;
  categoriaId: number;
  categoriaNome: string;
  categoriaTipo: string;
  source: 'orcamento';
}

/** Categoria direta do usuário */
export interface CategoriaDirectOption {
  categoriaId: number;
  categoriaNome: string;
  categoriaTipo: string;
  source: 'categoria';
}

export type CategoriaOption = CategoriaOrcamentoOption | CategoriaDirectOption;

export interface CategoriasForPeriodoResponse {
  orcamentoItens: CategoriaOrcamentoOption[];
  categorias: CategoriaDirectOption[];
}