import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Тести Nest працюють через SWC (підтримує decorator metadata) і vitest (нативний ESM: пакети Nest 12 є ESM).
 * e2e потребує реальної PostgreSQL: DATABASE_URL задає зовнішній запуск (docker / локальна БД), див. README.
 */
export default defineConfig({
  test: {
    globals: true,
    // мок PushService накопичує виклики протягом усього сценарію (тести залежать від порядку)
    clearMocks: false,
    mockReset: false,
    restoreMocks: false,
    include: ['test/**/*.e2e-spec.ts', 'src/**/*.spec.ts'],
    setupFiles: ['test/setup-env.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    pool: 'forks',
  },
  plugins: [swc.vite()],
});
