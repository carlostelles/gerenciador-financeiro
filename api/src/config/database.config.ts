import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { Categoria } from '../modules/categorias/entities/categoria.entity';
import { Orcamento } from '../modules/orcamentos/entities/orcamento.entity';
import { OrcamentoItem } from '../modules/orcamentos/entities/orcamento-item.entity';
import { Movimento } from '../modules/movimentacoes/entities/movimento.entity';
import { Reserva } from '../modules/reservas/entities/reserva.entity';

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
        Reserva,
      ],
      synchronize: true, // Desabilitado em produção por segurança
      logging: this.configService.get('NODE_ENV') === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations',
    };
  }
}