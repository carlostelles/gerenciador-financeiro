import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { LogsModule } from '../logs/logs.module';
import { PasswordResetController } from './password-reset/password-reset.controller';
import { PasswordResetService } from './password-reset/password-reset.service';
import { HostingerMailService } from './password-reset/hostinger-mail.service';
import { PasswordResetPayloadCipher } from './password-reset/password-reset-payload.cipher';
import { PasswordResetDeliveryStore } from './password-reset/password-reset-delivery.store';
import { PasswordResetDeliveryWorker } from './password-reset/password-reset-delivery.worker';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    UsuariosModule,
    LogsModule,
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    AuthService,
    PasswordResetService,
    HostingerMailService,
    PasswordResetPayloadCipher,
    PasswordResetDeliveryStore,
    PasswordResetDeliveryWorker,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
