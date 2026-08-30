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
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { OrcamentoItem } from './orcamento-item.entity';
import { Espaco } from '../../espacos/entities/espaco.entity';

@Entity('orcamentos')
export class Orcamento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  espacoId?: number;

  @Column({ length: 7 }) // yyyy-mm
  periodo: string;

  @Column({ length: 500 })
  descricao: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.orcamentos)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Espaco, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'espacoId' })
  espaco?: Espaco;

  @OneToMany(() => OrcamentoItem, (item) => item.orcamento, {
    cascade: true,
  })
  items: OrcamentoItem[];
}
