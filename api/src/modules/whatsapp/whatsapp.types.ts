export enum WhatsappInboundMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  UNSUPPORTED = 'UNSUPPORTED',
}

export enum WhatsappInboundProcessingStatus {
  RECEBIDA = 'RECEBIDA',
  PROCESSADA = 'PROCESSADA',
  IGNORADA_NAO_SUPORTADA = 'IGNORADA_NAO_SUPORTADA',
  FALHA = 'FALHA',
}

export enum WhatsappIntentType {
  NOVA_MOVIMENTACAO = 'NOVA_MOVIMENTACAO',
  EXTRATO = 'EXTRATO',
  COMPROVANTE = 'COMPROVANTE',
  DESCONHECIDA = 'DESCONHECIDA',
}

export interface WhatsappIntentResult {
  type: WhatsappIntentType;
  payload: {
    textoOriginal: string;
    valor?: number;
    data?: string;
    periodoInicio?: string;
    periodoFim?: string;
    categoriaNome?: string;
    descricao?: string;
    tipoMovimento?: 'RECEITA' | 'DESPESA';
  };
}
