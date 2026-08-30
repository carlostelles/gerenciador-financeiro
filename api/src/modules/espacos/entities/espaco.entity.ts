import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Usuario } from '../../usuarios/entities/usuario.entity';
import { EspacoMembro } from './espaco-membro.entity';

@Entity('espacos')
export class Espaco {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column()
  ownerUsuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerUsuarioId' })
  owner: Usuario;

  @OneToMany(() => EspacoMembro, (membro) => membro.espaco)
  membros: EspacoMembro[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
