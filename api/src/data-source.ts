import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { DatabaseConfig } from './config/database.config';

ConfigModule.forRoot({ envFilePath: '.env' });

const options = new DatabaseConfig(new ConfigService()).createTypeOrmOptions();

export default new DataSource({
  ...(options as DataSourceOptions),
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});