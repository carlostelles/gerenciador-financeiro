import { Categoria } from "./categoria.interface";
import { OrcamentoItem } from "./orcamento.interface";
import { Conta } from "./conta.interface";

export interface Movimento {
  id?: number;
  usuarioId: number;
  periodo: string;
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId?: number;
  orcamentoItem?: OrcamentoItem;
  categoriaId?: number;
  categoria?: Categoria;
  contaId?: number;
  conta?: Conta;
}

export interface CreateMovimentoDto {
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId?: number;
  categoriaId?: number;
  contaId?: number;
  parcelado?: boolean; // Novo campo para indicar se a movimentação é parcelada
  parcelas?: number; // Novo campo para indicar número de parcelas, se for parcelado
}

export interface UpdateMovimentoDto {
  data?: string;
  descricao?: string;
  valor?: number;
  orcamentoItemId?: number;
  categoriaId?: number;
  contaId?: number;
}

/** Filtros de pesquisa aplicados à listagem de movimentações de um período */
export interface MovimentoFiltro {
  categoriaId?: number;
  contaId?: number;
  descricao?: string;
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