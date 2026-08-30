import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Usuario } from '../../usuarios/entities/usuario.entity';
import { EspacoMembro } from './espaco-membro.entity';

export enum EspacoTipo {
  PERSONAL = 'PERSONAL',
  SHARED = 'SHARED',
}

@Entity('espacos')
@Index(
  'uq_espacos_owner_nome_normalizado',
  ['ownerUsuarioId', 'nomeNormalizado'],
  { unique: true },
)
export class Espaco {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nome: string;

  @Column({ type: 'enum', enum: EspacoTipo, default: EspacoTipo.SHARED })
  tipo: EspacoTipo;

  @Column({
    length: 120,
    asExpression: 'LOWER(TRIM(`nome`))',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  nomeNormalizado: string;

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
