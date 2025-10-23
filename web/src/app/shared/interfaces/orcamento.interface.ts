import { Categoria } from "./categoria.interface";

export interface OrcamentoItem {
  id: number;
  orcamentoId: number;
  descricao: string;
  valor: number;
  categoriaId: number;
  categoria: Categoria
}

export interface Orcamento {
  id: number;
  usuarioId: number;
  periodo: string;
  descricao: string;
  items: OrcamentoItem[];
}

export interface CreateOrcamentoDto {
  periodo: string;
  descricao: string;
}

export interface UpdateOrcamentoDto {
  periodo?: string;
  descricao?: string;
}

export interface CreateOrcamentoItemDto {
  descricao: string;
  valor: number;
  categoriaId: number;
}

export interface UpdateOrcamentoItemDto {
  descricao?: string;
  valor?: number;
  categoriaId?: number;
}

export interface CloneOrcamentoDto {
  id: number;
  periodo: string;
}