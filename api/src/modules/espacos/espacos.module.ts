import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { EspacosController } from './espacos.controller';
import { EspacosService } from './espacos.service';
import { EspacoMembro } from './entities/espaco-membro.entity';
import { Espaco } from './entities/espaco.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Espaco, EspacoMembro, Usuario])],
  controllers: [EspacosController],
  providers: [EspacosService],
  exports: [EspacosService],
})
export class EspacosModule {}