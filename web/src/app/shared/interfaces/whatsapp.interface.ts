export type WhatsappInboundMessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'UNSUPPORTED';

export type WhatsappInboundProcessingStatus =
  | 'RECEBIDA'
  | 'PROCESSADA'
  | 'IGNORADA_NAO_SUPORTADA'
  | 'FALHA';

export type WhatsappIntentType =
  | 'NOVA_MOVIMENTACAO'
  | 'EXTRATO'
  | 'COMPROVANTE'
  | 'DESCONHECIDA';

export interface WhatsappInboundMessage {
  id: number;
  usuarioId: number | null;
  telefoneOrigem: string;
  providerMessageId: string;
  tipoMensagem: WhatsappInboundMessageType;
  intentDetectada: WhatsappIntentType;
  statusProcessamento: WhatsappInboundProcessingStatus;
  mediaId: string | null;
  mimeType: string | null;
  nomeArquivo: string | null;
  movimentoId: number | null;
  periodoReferencia: string | null;
  texto: string | null;
  erroProcessamento: string | null;
  detalhesProcessamento: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
