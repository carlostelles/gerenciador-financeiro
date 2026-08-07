import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  WhatsappInboundMessageType,
  WhatsappInboundProcessingStatus,
  WhatsappIntentType,
} from '../whatsapp.types';

@Entity('whatsapp_inbound_messages')
export class WhatsappInboundMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  usuarioId: number | null;

  @Column({ length: 20 })
  telefoneOrigem: string;

  @Column({ length: 120, unique: true })
  providerMessageId: string;

  @Column({
    type: 'enum',
    enum: WhatsappInboundMessageType,
  })
  tipoMensagem: WhatsappInboundMessageType;

  @Column({
    type: 'enum',
    enum: WhatsappIntentType,
    default: WhatsappIntentType.DESCONHECIDA,
  })
  intentDetectada: WhatsappIntentType;

  @Column({
    type: 'enum',
    enum: WhatsappInboundProcessingStatus,
    default: WhatsappInboundProcessingStatus.RECEBIDA,
  })
  statusProcessamento: WhatsappInboundProcessingStatus;

  @Column({ nullable: true, length: 120 })
  mediaId: string | null;

  @Column({ nullable: true, length: 255 })
  mimeType: string | null;

  @Column({ nullable: true, length: 255 })
  nomeArquivo: string | null;

  @Column({ nullable: true, type: 'int' })
  movimentoId: number | null;

  @Column({ nullable: true, length: 7 })
  periodoReferencia: string | null;

  @Column({ type: 'longtext', nullable: true })
  texto: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  erroProcessamento: string | null;

  @Column({ type: 'json', nullable: true })
  detalhesProcessamento: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
