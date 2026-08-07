import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('whatsapp_webhook_events')
export class WhatsappWebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120, unique: true })
  idempotencyKey: string;

  @Column({ length: 40 })
  tipo: string;

  @Column({ nullable: true, length: 120 })
  providerMessageId: string | null;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
