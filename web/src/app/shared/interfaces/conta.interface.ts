export interface Conta {
  id: number;
  usuarioId: number;
  nome: string;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContaDto {
  nome: string;
  tags?: string | null;
}

export interface UpdateContaDto {
  nome?: string;
  tags?: string | null;
}
