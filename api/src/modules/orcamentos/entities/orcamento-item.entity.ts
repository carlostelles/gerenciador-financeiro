import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Orcamento } from './orcamento.entity';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Movimento } from '../../movimentacoes/entities/movimento.entity';

@Entity('orcamento_items')
export class OrcamentoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orcamentoId: number;

  @Column({ length: 500 })
  descricao: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column()
  categoriaId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Orcamento, (orcamento) => orcamento.items)
  @JoinColumn({ name: 'orcamentoId' })
  orcamento: Orcamento;

  @ManyToOne(() => Categoria, (categoria) => categoria.orcamentoItems)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @OneToMany(() => Movimento, (movimento) => movimento.orcamentoItem)
  movimentos: Movimento[];
}