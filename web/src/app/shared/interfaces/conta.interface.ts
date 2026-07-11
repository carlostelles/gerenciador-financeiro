export interface Conta {
  id: number;
  usuarioId: number;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContaDto {
  nome: string;
}

export interface UpdateContaDto {
  nome?: string;
}
