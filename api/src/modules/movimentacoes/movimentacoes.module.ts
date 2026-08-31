import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MovimentacoesService } from './movimentacoes.service';
import { MovimentacoesController } from './movimentacoes.controller';
import { Movimento } from './entities/movimento.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { OrcamentoItem } from '../orcamentos/entities/orcamento-item.entity';
import { Orcamento } from '../orcamentos/entities/orcamento.entity';
import { Conta } from '../contas/entities/conta.entity';
import { LogsModule } from '../logs/logs.module';
import { MovimentoComprovante } from './entities/movimento-comprovante.entity';
import { SaldoInicial } from './entities/saldo-inicial.entity';
import { MovimentoComprovanteStorageService } from './services/movimento-comprovante-storage.service';
import { MovimentoComprovanteAiService } from './services/movimento-comprovante-ai.service';
import { EspacosModule } from '../espacos/espacos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movimento,
      MovimentoComprovante,
      SaldoInicial,
      Categoria,
      OrcamentoItem,
      Orcamento,
      Conta,
    ]),
    JwtModule,
    LogsModule,
    EspacosModule,
  ],
  controllers: [MovimentacoesController],
  providers: [
    MovimentacoesService,
    MovimentoComprovanteStorageService,
    MovimentoComprovanteAiService,
  ],
  exports: [MovimentacoesService, MovimentoComprovanteStorageService],
})
export class MovimentacoesModule {}
