import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { DatabaseConfig } from './config/database.config';
import { MongoConfig } from './config/mongo.config';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { LogsModule } from './modules/logs/logs.module';
import { OrcamentosModule } from './modules/orcamentos/orcamentos.module';
import { MovimentacoesModule } from './modules/movimentacoes/movimentacoes.module';
import { ReservasModule } from './modules/reservas/reservas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    MongooseModule.forRootAsync({
      useClass: MongoConfig,
    }),
    AuthModule,
    UsuariosModule,
    CategoriasModule,
    LogsModule,
    OrcamentosModule,
    MovimentacoesModule,
    ReservasModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}