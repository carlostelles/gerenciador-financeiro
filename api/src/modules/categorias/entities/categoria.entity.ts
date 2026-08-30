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
import { CategoriaTipo } from '../../../common/types';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { OrcamentoItem } from '../../orcamentos/entities/orcamento-item.entity';
import { Reserva } from '../../reservas/entities/reserva.entity';
import { Espaco } from '../../espacos/entities/espaco.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  espacoId?: number;

  @Column({ length: 255 })
  nome: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  @Column({
    type: 'enum',
    enum: CategoriaTipo,
  })
  tipo: CategoriaTipo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.categorias)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Espaco, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'espacoId' })
  espaco?: Espaco;

  @OneToMany(() => OrcamentoItem, (item) => item.categoria)
  orcamentoItems: OrcamentoItem[];

  @OneToMany(() => Reserva, (reserva) => reserva.categoria)
  reservas: Reserva[];
}
