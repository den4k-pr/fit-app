import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables, NodeEnv } from '../config';
import { ALL_MIGRATIONS } from './all-migrations';
import { buildTypeOrmOptions } from './typeorm.options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const options = buildTypeOrmOptions({
          url: config.get('DATABASE_URL', { infer: true }),
          ssl: config.get('DATABASE_SSL', { infer: true }),
          logging: config.get('DATABASE_LOGGING', { infer: true }),
          poolMax: config.get('DATABASE_POOL_MAX', { infer: true }),
          // Схема бази має завжди відповідати коду: невиконані міграції застосовуються при старті (крім тестів)
          runMigrations:
            config.get('NODE_ENV', { infer: true }) !== NodeEnv.TEST &&
            !config.get('SKIP_MIGRATIONS', { infer: true }),
        });
        // Тести (vitest) не можуть require-ити `.ts` за глобом: сутності беремо з forFeature, міграції — явним списком
        return config.get('NODE_ENV', { infer: true }) === NodeEnv.TEST
          ? { ...options, entities: undefined, autoLoadEntities: true, migrations: ALL_MIGRATIONS }
          : options;
      },
    }),
  ],
})
export class DatabaseModule {}
