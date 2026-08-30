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
import { WhatsappWebhookEvent } from '../modules/whatsapp/entities/whatsapp-webhook-event.entity';
import { WhatsappInboundMessage } from '../modules/whatsapp/entities/whatsapp-inbound-message.entity';
import { WhatsappInboundJob } from '../modules/whatsapp/entities/whatsapp-inbound-job.entity';
import { WhatsappInboundResult } from '../modules/whatsapp/entities/whatsapp-inbound-result.entity';
import { WhatsappInboundCheckpoint } from '../modules/whatsapp/entities/whatsapp-inbound-checkpoint.entity';

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
        WhatsappWebhookEvent,
        WhatsappInboundMessage,
        WhatsappInboundJob,
        WhatsappInboundResult,
        WhatsappInboundCheckpoint,
      ],
      synchronize: this.configService.get('NODE_ENV') !== 'production',
      logging: this.configService.get('NODE_ENV') === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations',
    };
  }
}
