import { join } from 'node:path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export interface DbEnv {
  url: string;
  ssl: boolean;
  logging: boolean;
  poolMax: number;
  runMigrations: boolean;
}

/**
 * Єдині налаштування TypeORM: для застосунку (DatabaseModule) і для CLI (data-source.ts).
 * synchronize ЗАВЖДИ вимкнений: схема змінюється лише міграціями.
 */
export function buildTypeOrmOptions(env: DbEnv): PostgresConnectionOptions {
  return {
    type: 'postgres',
    url: env.url,
    ssl: env.ssl ? { rejectUnauthorized: false } : false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: env.runMigrations,
    migrationsTransactionMode: 'each',
    synchronize: false,
    logging: env.logging ? ['query', 'error', 'warn', 'migration'] : ['error', 'warn', 'migration'],
    // gen_random_uuid() є в ядрі PostgreSQL 13+, розширення не потрібні
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    extra: { max: env.poolMax },
  };
}
