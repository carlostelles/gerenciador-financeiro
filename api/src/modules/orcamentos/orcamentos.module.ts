import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OrcamentosService } from './orcamentos.service';
import { OrcamentosController } from './orcamentos.controller';
import { Orcamento } from './entities/orcamento.entity';
import { OrcamentoItem } from './entities/orcamento-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Orcamento, OrcamentoItem]),
    JwtModule,
  ],
  controllers: [OrcamentosController],
  providers: [OrcamentosService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}