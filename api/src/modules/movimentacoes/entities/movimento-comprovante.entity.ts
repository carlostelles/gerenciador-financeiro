import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
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

  @OneToOne(() => Movimento, (movimento) => movimento.comprovante, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'movimentoId' })
  movimento: Movimento | null;
}