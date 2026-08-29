import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Conta } from '../../contas/entities/conta.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum SaldoInicialOrigem {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

@Entity('saldo_iniciais')
@Unique(['usuarioId', 'contaId', 'periodo'])
export class SaldoInicial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  contaId: number;

  @Column({ length: 7 })
  periodo: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor: number;

  @Column({
    type: 'enum',
    enum: SaldoInicialOrigem,
    default: SaldoInicialOrigem.AUTO,
  })
  origem: SaldoInicialOrigem;

  @Column({ default: false })
  criadoPorManual: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.id)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Conta, (conta) => conta.id)
  @JoinColumn({ name: 'contaId' })
  conta: Conta;
}
