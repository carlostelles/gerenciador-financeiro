import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { PasswordReset } from './password-reset.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  LEASED = 'leased',
  DISPATCHING = 'dispatching',
  ACCEPTED = 'accepted',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  UNKNOWN = 'unknown',
}
export enum DeliveryErrorCode {
  PREPARATION = 'preparation',
  KEY_UNAVAILABLE = 'key_unavailable',
  PAYLOAD_INVALID = 'payload_invalid',
  REJECTED = 'rejected',
  UNCERTAIN = 'uncertain',
  INVALIDATED = 'invalidated',
  TTL = 'ttl',
}
export const erasedEnvelope = {
  keyId: null,
  nonce: null,
  authTag: null,
  ciphertext: null,
};

@Entity('recuperacao_envios')
@Index('IDX_delivery_available', ['status', 'availableAt', 'id'])
@Index('IDX_delivery_lease', ['status', 'leaseUntil'])
@Index('IDX_delivery_completed', ['status', 'completedAt'])
export class PasswordResetDelivery {
  @PrimaryColumn({ type: 'char', length: 36 }) id: string;
  @Column({ unique: true }) recuperacaoId: number;
  @OneToOne(() => PasswordReset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recuperacaoId' })
  recuperacao: PasswordReset;
  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;
  @Column({ type: 'datetime', precision: 3 }) createdAt: Date;
  @Column({ type: 'datetime', precision: 3 }) availableAt: Date;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) attempts: number;
  @Column({ type: 'char', length: 36, nullable: true }) leaseOwner:
    string | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) leaseVersion: number;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  leaseUntil: Date | null;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  dispatchStartedAt: Date | null;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  dispatchDeadlineAt: Date | null;
  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  payloadVersion: number;
  @Column({ type: 'varchar', length: 64, nullable: true }) keyId: string | null;
  @Column({ type: 'binary', length: 12, nullable: true }) nonce: Buffer | null;
  @Column({ type: 'binary', length: 16, nullable: true })
  authTag: Buffer | null;
  @Column({ type: 'blob', nullable: true }) ciphertext: Buffer | null;
  @Column({ type: 'enum', enum: DeliveryErrorCode, nullable: true })
  lastErrorCode: DeliveryErrorCode | null;
}
