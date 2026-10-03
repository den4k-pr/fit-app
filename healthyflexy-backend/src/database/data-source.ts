import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.options';

// Для CLI (міграції, seed): читаємо .env, якщо він є
try {
  process.loadEnvFile();
} catch {
  /* .env необов'язковий (на Railway змінні задаються в оточенні) */
}

const dataSource = new DataSource(
  buildTypeOrmOptions({
    url: process.env.DATABASE_URL ?? '',
    ssl: process.env.DATABASE_SSL === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
    runMigrations: false,
  }),
);

export default dataSource;
