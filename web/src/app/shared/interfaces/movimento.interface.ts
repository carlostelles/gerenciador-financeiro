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
  comprovante?: MovimentoComprovante;
}

export interface MovimentoComprovante {
  id: number;
  movimentoId: number | null;
  usuarioId: number;
  caminhoArquivo: string;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanhoArquivo: number;
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
  comprovanteId?: number;
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

/** Item de resumo de uma categoria (soma das movimentações) */
export interface ResumoCategoriaItem {
  categoriaId: number;
  categoriaNome: string;
  total: number;
}

/** Resumo das movimentações de um período, agrupado por tipo de categoria */
export interface ResumoPorCategoriaResponse {
  receitas: ResumoCategoriaItem[];
  despesas: ResumoCategoriaItem[];
  reservas: ResumoCategoriaItem[];
}

/** Comparativo de receitas, despesas e reservas por período */
export interface ComparativoPorTipoResponse {
  periodos: string[];
  receitas: number[];
  despesas: number[];
  reservas: number[];
}

export interface AnaliseComprovanteSugestao {
  data: string | null;
  periodo: string | null;
  valor: number | null;
  descricao: string | null;
  categoriaId: number | null;
  categoriaNome: string | null;
  contaId: number | null;
  contaNome: string | null;
}

export interface AnalisarComprovanteResponse {
  comprovanteId: number;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanhoArquivo: number;
  caminhoArquivo: string;
  sugestao: AnaliseComprovanteSugestao;
  camposObrigatoriosFaltantes: string[];
  salvamento: {
    status: 'pendente' | 'criado' | 'atualizado';
    movimentoId?: number;
  };
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