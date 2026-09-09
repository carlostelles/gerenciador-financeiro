import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './database.config';
import { PasswordRecovery1798844400000 } from '../migrations/1798844400000-PasswordRecovery';
import { PasswordResetDelivery } from '../modules/auth/password-reset/password-reset-delivery.entity';
import { PasswordResetDelivery1798930800000 } from '../migrations/1798930800000-PasswordResetDelivery';
import {
  PasswordReset,
  PasswordResetLimit,
} from '../modules/auth/password-reset/password-reset.entity';

describe('configuração schema recuperação', () => {
  it('registra entidades/migração explicitamente, não usa sync/logging de queries e usa UTC', () => {
    const options = new DatabaseConfig(
      new ConfigService({ NODE_ENV: 'development' }),
    ).createTypeOrmOptions();
    expect(options.synchronize).toBe(false);
    expect(options.logging).toBe(false);
    expect(options).toHaveProperty('timezone', 'Z');
    expect(options.entities).toEqual(
      expect.arrayContaining([PasswordReset, PasswordResetLimit, PasswordResetDelivery]),
    );
    expect(options.migrations).toEqual(
      expect.arrayContaining([PasswordRecovery1798844400000, PasswordResetDelivery1798930800000]),
    );
  });
});
