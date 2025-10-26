export enum LogAcao {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export interface Log {
  _id: string;
  data: Date;
  usuarioId: number;
  descricao: string;
  acao: LogAcao;
  entidade?: string;
  entidadeId?: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
  createdAt: Date;
  updatedAt: Date;
}