import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { OrcamentoItem } from '../../orcamentos/entities/orcamento-item.entity';
import { Categoria } from '../../categorias/entities/categoria.entity';

@Entity('movimentos')
export class Movimento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column({ length: 7 }) // yyyy-mm
  periodo: string;

  @Column({ type: 'date' })
  data: Date;

  @Column({ length: 500 })
  descricao: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column({ nullable: true })
  orcamentoItemId: number;

  @Column({ nullable: true })
  categoriaId: number;

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
}