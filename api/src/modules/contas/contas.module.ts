import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { ContasService } from './contas.service';
import { ContasController } from './contas.controller';
import { Conta } from './entities/conta.entity';
import { Movimento } from '../movimentacoes/entities/movimento.entity';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conta, Movimento]),
    JwtModule,
    LogsModule,
  ],
  controllers: [ContasController],
  providers: [ContasService],
  exports: [ContasService],
})
export class ContasModule {}
