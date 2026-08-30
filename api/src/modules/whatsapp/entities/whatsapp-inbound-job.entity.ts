import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WhatsappJobStatus } from '../whatsapp.types';

@Entity('whatsapp_inbound_jobs')
export class WhatsappInboundJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120, unique: true })
  providerMessageId: string;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: WhatsappJobStatus,
    default: WhatsappJobStatus.PENDENTE,
  })
  status: WhatsappJobStatus;

  @Column({ type: 'int', default: 0 })
  tentativas: number;

  @Column({ type: 'int', default: 5 })
  maxTentativas: number;

  @Column({ type: 'datetime', nullable: true })
  proximaTentativaEm: Date | null;

  @Column({ type: 'datetime', nullable: true })
  leaseAte: Date | null;

  @Column({ nullable: true, length: 80 })
  leasedBy: string | null;

  @Column({ nullable: true, length: 500 })
  ultimoErro: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
