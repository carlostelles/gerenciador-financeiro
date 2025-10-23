export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum CategoriaTipo {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  RESERVA = 'RESERVA',
}

export enum LogAcao {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export interface ErrorResponse {
  message: string;
  details?: string;
}