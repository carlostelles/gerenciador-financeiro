export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  role?: UserRole;
}

export interface UpdateUsuarioDto {
  nome?: string;
  email?: string;
  senha?: string;
  telefone?: string;
  role?: UserRole;
  ativo?: boolean;
}