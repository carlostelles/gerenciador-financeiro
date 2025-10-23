import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LogAcao } from '../../../common/types';

export type LogDocument = Log & Document;

@Schema({ timestamps: true })
export class Log {
  @Prop({ required: true })
  data: Date;

  @Prop({ required: true })
  usuarioId: number;

  @Prop({ required: true, maxlength: 500 })
  descricao: string;

  @Prop({ required: true, enum: LogAcao })
  acao: LogAcao;

  @Prop()
  entidade?: string;

  @Prop()
  entidadeId?: string;

  @Prop({ type: Object })
  dadosAnteriores?: any;

  @Prop({ type: Object })
  dadosNovos?: any;
}

export const LogSchema = SchemaFactory.createForClass(Log);