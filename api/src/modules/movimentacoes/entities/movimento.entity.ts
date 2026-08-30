import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { OrcamentoItem } from '../../orcamentos/entities/orcamento-item.entity';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Conta } from '../../contas/entities/conta.entity';
import { MovimentoComprovante } from './movimento-comprovante.entity';

@Entity('movimentos')
export class Movimento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column({ length: 7 }) // yyyy-mm
  periodo: string;

  @Column({ type: 'date', nullable: true })
  data: Date | null;

  @Column({ length: 500, nullable: true })
  descricao: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  valor: number | null;

  @Column({ nullable: true })
  orcamentoItemId: number;

  @Column({ nullable: true })
  categoriaId: number;

  @Column({ nullable: true })
  contaId: number;

  @Index('IDX_movimentos_comprovanteId')
  @Column({ nullable: true })
  comprovanteId: number | null;

  @Index({ unique: true })
  @Column({ length: 190, nullable: true })
  idempotencyKey: string | null;

  @Column({ default: false })
  revisado: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.movimentos)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => OrcamentoItem, (item) => item.movimentos, { nullable: true })
  @JoinColumn({ name: 'orcamentoItemId' })
  orcamentoItem: OrcamentoItem;

  @ManyToOne(() => Categoria, { nullable: true })
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @ManyToOne(() => Conta, (conta) => conta.movimentos, { nullable: true })
  @JoinColumn({ name: 'contaId' })
  conta: Conta;

  @ManyToOne(
    () => MovimentoComprovante,
    (comprovante) => comprovante.movimentos,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'comprovanteId' })
  comprovante: MovimentoComprovante | null;
}
