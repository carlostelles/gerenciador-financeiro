import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookEvent } from './entities/whatsapp-webhook-event.entity';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Movimento } from '../movimentacoes/entities/movimento.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { MovimentacoesModule } from '../movimentacoes/movimentacoes.module';
import { WhatsappIntentParserService } from './services/whatsapp-intent-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappWebhookEvent,
      WhatsappInboundMessage,
      Usuario,
      Movimento,
      Categoria,
    ]),
    JwtModule,
    MovimentacoesModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappIntentParserService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
