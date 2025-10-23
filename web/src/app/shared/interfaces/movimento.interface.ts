import { OrcamentoItem } from "./orcamento.interface";

export interface Movimento {
  id: number;
  usuarioId: number;
  periodo: string;
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId: number;
  orcamentoItem: OrcamentoItem;
}

export interface CreateMovimentoDto {
  data: string;
  descricao: string;
  valor: number;
  orcamentoItemId: number;
}

export interface UpdateMovimentoDto {
  data?: string;
  descricao?: string;
  valor?: number;
  orcamentoItemId?: number;
}