export type EspacoPapel = 'OWNER' | 'EDITOR' | 'VIEWER';
export type EspacoTipo = 'PERSONAL' | 'SHARED';

export interface Espaco {
  id: number;
  nome: string;
  tipo: EspacoTipo;
  ownerUsuarioId: number;
  papel: EspacoPapel;
}

export interface EspacoMembro {
  usuarioId: number;
  papel: EspacoPapel;
  usuario?: { id: number; nome: string; email: string };
}
