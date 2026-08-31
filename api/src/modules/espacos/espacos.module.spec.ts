import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

import { EspacosModule } from './espacos.module';

describe('EspacosModule', () => {
  const jwtOptionsToken = 'JWT_MODULE_OPTIONS';

  const getJwtOptionsFactory = () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      EspacosModule,
    ) as unknown[];
    const jwtModule = imports.find(
      (moduleImport: any) => moduleImport.module === JwtModule,
    ) as any;
    const optionsProvider = jwtModule.providers.find(
      (provider: any) => provider.provide === jwtOptionsToken,
    );

    return optionsProvider.useFactory as (
      configService: ConfigService,
    ) => JwtModuleOptions;
  };

  it('configura JwtModule com o mesmo segredo e expiração da autenticação', () => {
    const configService = {
      get: jest.fn(
        (key: string) =>
          ({
            JWT_SECRET: 'segredo-de-teste',
            JWT_EXPIRES_IN: '5m',
          })[key],
      ),
    } as unknown as ConfigService;

    expect(getJwtOptionsFactory()(configService)).toEqual({
      secret: 'segredo-de-teste',
      signOptions: { expiresIn: '5m' },
    });
  });

  it('falha de forma restritiva quando JWT_SECRET não está configurado', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(() => getJwtOptionsFactory()(configService)).toThrow(
      'JWT_SECRET não configurado',
    );
  });
});
