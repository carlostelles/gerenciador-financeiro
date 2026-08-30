export type EspacoPapel = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Espaco {
  id: number;
  nome: string;
  ownerUsuarioId?: number;
  papel: EspacoPapel;
}

export interface EspacoMembro {
  usuarioId: number;
  papel: EspacoPapel;
  usuario?: { id: number; nome: string; email: string };
}
