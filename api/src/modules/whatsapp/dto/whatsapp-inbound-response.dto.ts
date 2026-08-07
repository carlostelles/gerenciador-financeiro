import { ApiProperty } from '@nestjs/swagger';
import {
  WhatsappInboundMessageType,
  WhatsappInboundProcessingStatus,
  WhatsappIntentType,
} from '../whatsapp.types';

export class WhatsappInboundResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  usuarioId: number | null;

  @ApiProperty()
  telefoneOrigem: string;

  @ApiProperty()
  providerMessageId: string;

  @ApiProperty({ enum: WhatsappInboundMessageType })
  tipoMensagem: WhatsappInboundMessageType;

  @ApiProperty({ enum: WhatsappIntentType })
  intentDetectada: WhatsappIntentType;

  @ApiProperty({ enum: WhatsappInboundProcessingStatus })
  statusProcessamento: WhatsappInboundProcessingStatus;

  @ApiProperty({ nullable: true })
  mediaId: string | null;

  @ApiProperty({ nullable: true })
  mimeType: string | null;

  @ApiProperty({ nullable: true })
  nomeArquivo: string | null;

  @ApiProperty({ nullable: true })
  movimentoId: number | null;

  @ApiProperty({ nullable: true })
  periodoReferencia: string | null;

  @ApiProperty({ nullable: true })
  texto: string | null;

  @ApiProperty({ nullable: true })
  erroProcessamento: string | null;

  @ApiProperty({ nullable: true, type: Object })
  detalhesProcessamento: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
