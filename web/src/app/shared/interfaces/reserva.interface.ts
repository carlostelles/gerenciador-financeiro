export interface Reserva {
  id: number;
  usuarioId: number;
  data: string;
  descricao: string;
  valor: number;
  categoriaId: number;
}

export interface CreateReservaDto {
  data: string;
  descricao: string;
  valor: number;
  categoriaId: number;
}

export interface UpdateReservaDto {
  descricao?: string;
  valor?: number;
  categoriaId?: number;
}