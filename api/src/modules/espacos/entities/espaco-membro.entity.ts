import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Espaco } from './espaco.entity';

export enum EspacoPapel {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

@Entity('espaco_membros')
@Unique('uq_espaco_membro', ['espacoId', 'usuarioId'])
export class EspacoMembro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  espacoId: number;

  @Column()
  usuarioId: number;

  @Column({ type: 'enum', enum: EspacoPapel })
  papel: EspacoPapel;

  @Index('uq_espaco_owner', { unique: true })
  @Column({
    type: 'int',
    nullable: true,
    asExpression: "CASE WHEN `papel` = 'OWNER' THEN `espacoId` ELSE NULL END",
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  ownerEspacoId: number | null;

  @ManyToOne(() => Espaco, (espaco) => espaco.membros, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'espacoId' })
  espaco: Espaco;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
