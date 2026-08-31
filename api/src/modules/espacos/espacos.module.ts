import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { EspacosController } from './espacos.controller';
import { EspacosService } from './espacos.service';
import { EspacoMembro } from './entities/espaco-membro.entity';
import { Espaco } from './entities/espaco.entity';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET não configurado');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN'),
          },
        };
      },
    }),
    TypeOrmModule.forFeature([Espaco, EspacoMembro, Usuario]),
  ],
  controllers: [EspacosController],
  providers: [EspacosService],
  exports: [EspacosService],
})
export class EspacosModule {}
