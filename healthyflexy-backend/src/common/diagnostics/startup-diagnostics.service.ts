import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { accessSync, constants, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { mailSender, RESEND_SANDBOX_SENDER } from '../../modules/email/email-sender';
import {
  AiProviderName,
  EmailProviderName,
  EnvironmentVariables,
  NodeEnv,
  SmsProviderName,
  StorageDriver,
} from '../../config';

/** IPv4-адреси комп'ютера в локальній мережі: саме за ними телефон може дістатися до сервера */
export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

/** Пароль у рядку підключення маскуємо */
function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}${u.password ? ':•••' : ''}@${u.host}${u.pathname}`;
  } catch {
    return '(некоректний DATABASE_URL)';
  }
}

/**
 * Діагностика при старті: одним блоком у лозі показує, що працює, а що ні, і ЯК виправити.
 * Найчастіші причини «код не приходить / застосунок не бачить сервер»: SMS_PROVIDER=console (SMS не шлеться),
 * Twilio без ключів, порожня база (немає вправ), невиконані міграції, телефон не бачить localhost.
 */
@Injectable()
export class StartupDiagnostics implements OnApplicationBootstrap {
  private readonly logger = new Logger('Startup');

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const get = <K extends keyof EnvironmentVariables>(key: K) =>
      this.config.get(key, { infer: true });
    const env = get('NODE_ENV');
    if (env === NodeEnv.TEST) return;

    const info: string[] = [];
    const problems: string[] = [];
    const port = get('PORT');
    const prefix = get('API_GLOBAL_PREFIX');

    // ── База даних ──
    try {
      await this.db.query('SELECT 1');
      info.push(`✅ База даних: ${maskDatabaseUrl(get('DATABASE_URL'))}`);
      if (await this.db.showMigrations()) {
        problems.push('❌ Є невиконані міграції → виконайте: npm run migration:run');
      }
      const [{ t }]: Array<{ t: string | null }> = await this.db.query(
        "SELECT to_regclass('public.exercises') AS t",
      );
      if (!t) {
        problems.push('❌ Таблиць у базі немає → виконайте: npm run migration:run');
      } else {
        const cols: Array<{ table_name: string }> = await this.db.query(
          `SELECT table_name FROM information_schema.columns
           WHERE (table_name = 'users' AND column_name = 'email')
              OR (table_name = 'otp_codes' AND column_name = 'target')`,
        );
        if (cols.length < 2) {
          problems.push(
            '❌ Схема бази застаріла: немає колонки users.email або otp_codes.target (вхід за поштою не працюватиме). ' +
              'Міграції мали виконатися на старті: шукайте помилку міграції вище в логах, або виконайте: npm run migration:run',
          );
        }
        const rows: Array<{ n: number }> = await this.db.query(
          'SELECT count(*)::int AS n FROM exercises WHERE is_active',
        );
        if (rows[0].n === 0)
          problems.push(
            '❌ Довідник вправ порожній: «Сьогодні» буде без вправ → виконайте: npm run seed',
          );
        else info.push(`✅ Вправ у довіднику: ${rows[0].n}`);
      }
    } catch (error) {
      problems.push(
        `❌ Немає з'єднання з базою (${String(error)}) → перевірте DATABASE_URL і що PostgreSQL запущено`,
      );
    }

    // ── SMS ──
    const sms = get('SMS_PROVIDER');
    if (sms === SmsProviderName.SMSAPI) {
      if (get('SMSAPI_TOKEN'))
        info.push(
          `✅ SMS: SMSAPI (${get('SMSAPI_URL')}), відправник ${get('SMSAPI_SENDER') || 'за замовчуванням акаунта'}`,
        );
      else
        problems.push(
          '❌ SMS_PROVIDER=smsapi, але немає SMSAPI_TOKEN: вхід за телефоном недоступний (SMS_NOT_CONFIGURED)',
        );
    } else if (sms === SmsProviderName.TWILIO) {
      const ok =
        !!get('TWILIO_ACCOUNT_SID') &&
        !!get('TWILIO_AUTH_TOKEN') &&
        (!!get('TWILIO_MESSAGING_SERVICE_SID') || !!get('TWILIO_FROM_NUMBER'));
      if (ok)
        info.push(
          '✅ SMS: Twilio налаштовано (перевірте Geo permissions у Twilio для ваших країн)',
        );
      else
        problems.push(
          '❌ SMS_PROVIDER=twilio, але немає TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_MESSAGING_SERVICE_SID (або TWILIO_FROM_NUMBER): код на телефон НЕ прийде (OTP_SEND_FAILED)',
        );
    } else if (env === NodeEnv.PRODUCTION) {
      info.push(
        '⚠️  SMS_PROVIDER=console у production: вхід за телефоном недоступний (SMS_NOT_CONFIGURED). Для SMS: SMS_PROVIDER=smsapi + SMSAPI_TOKEN',
      );
    } else {
      problems.push(
        '⚠️  SMS_PROVIDER=console: SMS на телефон НЕ надсилаються. Код друкується в цьому лозі («SMS НЕ відправлено … Текст»). Для реальних SMS: SMS_PROVIDER=smsapi + SMSAPI_TOKEN',
      );
    }
    info.push(`ℹ️  SMS дозволені для країн: ${get('SMS_ALLOWED_COUNTRIES')}`);

    // ── Пошта (підтвердження пошти кодом при реєстрації та вході) ──
    const sender = mailSender(this.config);
    if (get('EMAIL_PROVIDER') === EmailProviderName.RESEND) {
      if (!get('RESEND_API_KEY')) {
        problems.push(
          '❌ EMAIL_PROVIDER=resend, але немає RESEND_API_KEY: листи з кодом НЕ підуть (OTP_SEND_FAILED)',
        );
      } else if (sender.includes(RESEND_SANDBOX_SENDER)) {
        info.push('✅ Пошта: Resend налаштовано');
        problems.push(
          `⚠️  Відправник ${RESEND_SANDBOX_SENDER}: Resend шле з нього лише на адресу власника акаунта. Підтвердіть свій домен (Resend → Domains) і задайте MAIL_FROM=auth@ваш-домен`,
        );
      } else {
        info.push(`✅ Пошта: Resend, відправник ${sender}`);
      }
    } else if (env === NodeEnv.PRODUCTION) {
      problems.push(
        '❌ EMAIL_PROVIDER=console у production: листи НЕ відправляються, вхід за поштою неможливий! Задайте EMAIL_PROVIDER=resend + RESEND_API_KEY + MAIL_FROM',
      );
    } else {
      info.push(
        'ℹ️  EMAIL_PROVIDER=console (розробка): листи НЕ надсилаються, текст із кодом друкується в лозі',
      );
    }

    // ── AI-перевірка вправ ──
    if (get('AI_PROVIDER') === AiProviderName.OPENAI) {
      info.push(
        `✅ AI-перевірка вправ: OpenAI ${get('AI_MODEL')}, поріг ${get('AI_SCORE_THRESHOLD')}`,
      );
    } else if (env === NodeEnv.PRODUCTION) {
      problems.push(
        '❌ AI_PROVIDER=stub у production: кадри НЕ аналізуються, будь-яка вправа зараховується! Задайте AI_PROVIDER=openai',
      );
    } else {
      problems.push(
        '⚠️  AI_PROVIDER=stub: кадри НЕ аналізуються, кожна вправа з кадрами зараховується автоматично. Для реальної перевірки: AI_PROVIDER=openai',
      );
    }

    // ── Сховище кадрів і адреси ──
    const publicBase = get('PUBLIC_BASE_URL');
    if (get('STORAGE_DRIVER') === StorageDriver.LOCAL) {
      const dir = get('STORAGE_LOCAL_DIR');
      try {
        mkdirSync(dir, { recursive: true });
        accessSync(dir, constants.W_OK);
        info.push(`✅ Сховище кадрів: локальне (${dir}), запис дозволено`);
      } catch (error) {
        problems.push(
          `❌ Немає прав запису в STORAGE_LOCAL_DIR=${dir} (${String(error)}). На Railway з Volume додайте змінну RAILWAY_RUN_UID=0`,
        );
      }
      if (env === NodeEnv.PRODUCTION) {
        const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
        if (!volume) {
          problems.push(
            '⚠️  Локальні кадри без Volume зникнуть при кожному деплої. Додайте Volume (mount /data) і STORAGE_LOCAL_DIR=/data/storage, або STORAGE_DRIVER=s3',
          );
        } else if (!resolve(dir).startsWith(resolve(volume))) {
          problems.push(
            `⚠️  STORAGE_LOCAL_DIR=${dir} поза Volume (${volume}): кадри зникнуть при деплої`,
          );
        }
      }
      if (/localhost|127\.0\.0\.1/.test(publicBase) && env !== NodeEnv.PRODUCTION) {
        problems.push(
          `⚠️  PUBLIC_BASE_URL=${publicBase}: телефон не завантажить кадри на «localhost» (це сам телефон). Задайте IP комп'ютера в .env`,
        );
      }
    } else {
      info.push('✅ Сховище кадрів: S3/R2');
    }
    if (env === NodeEnv.PRODUCTION) {
      info.push(`ℹ️  Публічна адреса API (PUBLIC_BASE_URL): ${publicBase}`);
      if (!/^https:\/\//.test(publicBase)) {
        problems.push(
          '⚠️  PUBLIC_BASE_URL без https: iOS-застосунок не зможе завантажувати кадри. Задайте https://<ваш-сервіс>.up.railway.app',
        );
      }
    } else {
      const lan = lanAddresses();
      info.push(`🌐 Локально: http://localhost:${port}/${prefix}`);
      for (const ip of lan)
        info.push(
          `📱 З телефона (та ж Wi-Fi): http://${ip}:${port}/${prefix}   ← вставте в EXPO_PUBLIC_API_URL мобільного; PUBLIC_BASE_URL=http://${ip}:${port}`,
        );
      if (lan.length === 0)
        problems.push(
          '⚠️  Не знайдено адрес у локальній мережі: телефон не зможе підключитися (перевірте Wi-Fi)',
        );
    }

    this.logger.log(`Healthyflexy API [${env}]\n  ${info.join('\n  ')}`);
    if (problems.length > 0) this.logger.warn(`Що виправити:\n  ${problems.join('\n  ')}`);
  }
}
