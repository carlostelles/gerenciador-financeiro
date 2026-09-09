import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('recuperacoes_senha')
@Index(['usuarioId', 'revokedAt'])
export class PasswordReset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ type: 'char', length: 64, unique: true })
  digest: string;

  @Column({ type: 'datetime', precision: 3 })
  issuedAt: Date;

  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'int', unsigned: true })
  credenciaisVersao: number;
}

@Entity('recuperacao_limites')
export class PasswordResetLimit {
  @PrimaryColumn({ type: 'char', length: 64 })
  emailDigest: string;

  @Column({ type: 'json' })
  admissions: number[];
}
