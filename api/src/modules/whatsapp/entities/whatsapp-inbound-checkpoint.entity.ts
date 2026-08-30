import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WhatsappCheckpointEtapa {
  UPLOAD = 'UPLOAD',
  ANALISE = 'ANALISE',
  RESULTADO = 'RESULTADO',
}

@Entity('whatsapp_inbound_checkpoints')
@Index(['providerMessageId', 'etapa', 'ordinal'], { unique: true })
export class WhatsappInboundCheckpoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  providerMessageId: string;

  @Column({ type: 'enum', enum: WhatsappCheckpointEtapa })
  etapa: WhatsappCheckpointEtapa;

  @Column({ type: 'int', default: 0 })
  ordinal: number;

  @Column({ type: 'json' })
  dados: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
