import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Movimento } from './movimento.entity';

@Entity('movimento_comprovantes')
export class MovimentoComprovante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  movimentoId: number | null;

  @Index({ unique: true })
  @Column({ length: 190, nullable: true })
  idempotencyKey: string | null;

  @Column()
  usuarioId: number;

  @Column({ length: 500 })
  caminhoArquivo: string;

  @Column({ length: 255 })
  nomeArquivo: string;

  @Column({ length: 120 })
  tipoArquivo: string;

  @Column({ type: 'int', unsigned: true })
  tamanhoArquivo: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Movimento, (movimento) => movimento.comprovante)
  movimentos: Movimento[];
}
