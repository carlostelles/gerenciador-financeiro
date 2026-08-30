import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('whatsapp_inbound_results')
@Index(['inboundMessageId', 'ordinal'], { unique: true })
export class WhatsappInboundResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  inboundMessageId: number;

  @Column({ type: 'int', nullable: true })
  movimentoId: number | null;

  @Column({ type: 'int', nullable: true })
  comprovanteId: number | null;

  @Column({ type: 'int' })
  ordinal: number;

  @Column({ length: 40 })
  status: string;

  @Column({ type: 'json', nullable: true })
  detalhes: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
