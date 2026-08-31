import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ReservasService } from './reservas.service';
import { ReservasController } from './reservas.controller';
import { Reserva } from './entities/reserva.entity';
import { LogsModule } from '../logs/logs.module';
import { EspacosModule } from '../espacos/espacos.module';
import { CategoriasModule } from '../categorias/categorias.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva]),
    JwtModule,
    LogsModule,
    EspacosModule,
    CategoriasModule,
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
