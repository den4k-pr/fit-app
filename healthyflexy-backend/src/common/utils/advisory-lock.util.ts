import { DataSource } from 'typeorm';

/**
 * Виконує `fn`, лише якщо вдалося взяти advisory-lock у PostgreSQL: cron-задачі не перетинаються, навіть якщо
 * запущено кілька реплік API. Повертає false, якщо лок зайнятий (задачу виконує інша репліка).
 */
export async function withAdvisoryLock(
  dataSource: DataSource,
  key: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    const [{ locked }] = (await runner.query('SELECT pg_try_advisory_lock($1) AS locked', [
      key,
    ])) as Array<{ locked: boolean }>;
    if (!locked) return false;
    try {
      await fn();
      return true;
    } finally {
      await runner.query('SELECT pg_advisory_unlock($1)', [key]);
    }
  } finally {
    await runner.release();
  }
}
