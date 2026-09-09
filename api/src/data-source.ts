import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from './config/database.config';

ConfigModule.forRoot({ envFilePath: '.env' });

const options = new DatabaseConfig(new ConfigService()).createTypeOrmOptions();

export default new DataSource({
  ...(options as DataSourceOptions),
});
