import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Оточення e2e: реальна PostgreSQL (DATABASE_URL із зовнішнього запуску), тимчасова папка сховища; коди входу тести читають із «вихідних» консольних провайдерів */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'e2e-jwt-secret-e2e-jwt-secret-e2e-jwt-secret';
process.env.TOKEN_HASH_SECRET = 'e2e-hash-secret-e2e-hash-secret-e2e-hash-secret';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = mkdtempSync(join(tmpdir(), 'hf-e2e-storage-'));
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.SWAGGER_ENABLED = 'false';
process.env.LOG_FORMAT = 'json';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'e2e-admin-password';
// Stripe у e2e: клієнт підмінено фейком (без мережі); підпис вебхуків перевіряється справжнім кодом Stripe
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_e2e_test_secret';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_e2e';
