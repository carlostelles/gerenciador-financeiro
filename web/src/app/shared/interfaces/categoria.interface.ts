export enum CategoriaTipo {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  RESERVA = 'RESERVA'
}

export interface Categoria {
  id: number;
  usuarioId: number;
  nome: string;
  descricao: string;
  tipo: CategoriaTipo;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoriaDto {
  nome: string;
  descricao?: string;
  tipo: CategoriaTipo;
}

export interface UpdateCategoriaDto {
  nome?: string;
  descricao?: string;
  tipo?: CategoriaTipo;
}