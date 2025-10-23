import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../../common/types';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Orcamento } from '../../orcamentos/entities/orcamento.entity';
import { Movimento } from '../../movimentacoes/entities/movimento.entity';
import { Reserva } from '../../reservas/entities/reserva.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nome: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  senha: string;

  @Column({ length: 20, unique: true })
  telefone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Categoria, (categoria) => categoria.usuario)
  categorias: Categoria[];

  @OneToMany(() => Orcamento, (orcamento) => orcamento.usuario)
  orcamentos: Orcamento[];

  @OneToMany(() => Movimento, (movimento) => movimento.usuario)
  movimentos: Movimento[];

  @OneToMany(() => Reserva, (reserva) => reserva.usuario)
  reservas: Reserva[];
}