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
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Espaco } from '../../espacos/entities/espaco.entity';

@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  espacoId?: number;

  @Column({ type: 'date' })
  data: Date;

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

  @ManyToOne(() => Usuario, (usuario) => usuario.reservas)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Espaco, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'espacoId' })
  espaco?: Espaco;

  @ManyToOne(() => Categoria, (categoria) => categoria.reservas)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;
}
