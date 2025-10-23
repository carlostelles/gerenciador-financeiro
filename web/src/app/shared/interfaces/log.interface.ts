export enum LogAcao {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export interface Log {
  id: number;
  data: string;
  usuarioId: number;
  descricao: string;
  acao: LogAcao;
}