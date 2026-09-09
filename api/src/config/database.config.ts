import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { Categoria } from '../modules/categorias/entities/categoria.entity';
import { Orcamento } from '../modules/orcamentos/entities/orcamento.entity';
import { OrcamentoItem } from '../modules/orcamentos/entities/orcamento-item.entity';
import { Movimento } from '../modules/movimentacoes/entities/movimento.entity';
import { MovimentoComprovante } from '../modules/movimentacoes/entities/movimento-comprovante.entity';
import { Reserva } from '../modules/reservas/entities/reserva.entity';
import { Conta } from '../modules/contas/entities/conta.entity';
import { SaldoInicial } from '../modules/movimentacoes/entities/saldo-inicial.entity';
import { Espaco } from '../modules/espacos/entities/espaco.entity';
import { EspacoMembro } from '../modules/espacos/entities/espaco-membro.entity';
import {
  PasswordReset,
  PasswordResetLimit,
} from '../modules/auth/password-reset/password-reset.entity';
import { CreateWhatsappTables1722988800000 } from '../migrations/1722988800000-create-whatsapp-tables';
import { CreateSaldoIniciais1756500000000 } from '../migrations/1756500000000-create-saldo-iniciais';
import { CreateWhatsappInboundMessages1786060800000 } from '../migrations/1786060800000-create-whatsapp-inbound-messages';
import { AddWhatsappDurableMediaJobs1788134400000 } from '../migrations/1788134400000-add-whatsapp-durable-media-jobs';
import { AddWhatsappCrashSafetyAndComprovanteCardinality1798502400000 } from '../migrations/1798502400000-add-whatsapp-crash-safety-and-comprovante-cardinality';
import { RemoveWhatsappIntegration1798588800000 } from '../migrations/1798588800000-remove-whatsapp-integration';
import { CreateFinancialSpaces1798675200000 } from '../migrations/1798675200000-create-financial-spaces';
import { HardenFinancialSpaces1798758000000 } from '../migrations/1798758000000-harden-financial-spaces';
import { PasswordRecovery1798844400000 } from '../migrations/1798844400000-PasswordRecovery';
import { PasswordResetDelivery1798930800000 } from '../migrations/1798930800000-PasswordResetDelivery';
import { PasswordResetDelivery } from '../modules/auth/password-reset/password-reset-delivery.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_DATABASE'),
      entities: [
        Usuario,
        Categoria,
        Orcamento,
        OrcamentoItem,
        Movimento,
        MovimentoComprovante,
        SaldoInicial,
        Reserva,
        Conta,
        Espaco,
        EspacoMembro,
        PasswordReset,
        PasswordResetLimit,
        PasswordResetDelivery,
      ],
      synchronize: false,
      timezone: 'Z',
      // Query errors/parameters can contain password hashes and recovery digests.
      logging: false,
      migrations: [
        CreateWhatsappTables1722988800000,
        CreateSaldoIniciais1756500000000,
        CreateWhatsappInboundMessages1786060800000,
        AddWhatsappDurableMediaJobs1788134400000,
        AddWhatsappCrashSafetyAndComprovanteCardinality1798502400000,
        RemoveWhatsappIntegration1798588800000,
        CreateFinancialSpaces1798675200000,
        HardenFinancialSpaces1798758000000,
        PasswordRecovery1798844400000,
        PasswordResetDelivery1798930800000,
      ],
      migrationsTableName: 'migrations',
    };
  }
}
