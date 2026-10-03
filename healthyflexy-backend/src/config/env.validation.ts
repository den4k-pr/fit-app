import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

export enum StorageDriver {
  LOCAL = 'local',
  S3 = 's3',
}

export enum LogFormat {
  PRETTY = 'pretty',
  JSON = 'json',
}

export enum EmailProviderName {
  CONSOLE = 'console',
  RESEND = 'resend',
}

export enum SmsProviderName {
  CONSOLE = 'console',
  /** SMSAPI.com — найдешевший для Польщі/України (основний) */
  SMSAPI = 'smsapi',
  TWILIO = 'twilio',
}

export enum AiProviderName {
  /** Детермінований фейковий результат, без реального виклику — dev/тести без ключа */
  STUB = 'stub',
  OPENAI = 'openai',
}

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/**
 * Змінні оточення. Валідуються при старті: застосунок не запуститься з неправильним конфігом.
 * Доступ: `ConfigService<EnvironmentVariables, true>` → `config.get('PORT', { infer: true })`.
 */
export class EnvironmentVariables {
  // ───── App ─────
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  API_GLOBAL_PREFIX: string = 'api/v1';

  @Transform(toBoolean)
  @IsBoolean()
  TRUST_PROXY: boolean = true;

  /** Через кому. Порожньо = CORS вимкнено (мобільному клієнту він не потрібен) */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  @IsString()
  APP_DEEP_LINK_SCHEME: string = 'healthyflexy';

  // ───── Database ─────
  @IsString()
  @MinLength(10)
  DATABASE_URL: string;

  @Transform(toBoolean)
  @IsBoolean()
  DATABASE_SSL: boolean = false;

  @Transform(toBoolean)
  @IsBoolean()
  DATABASE_LOGGING: boolean = false;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  DATABASE_POOL_MAX: number = 10;

  /** УСТАРІЛО і ігнорується: міграції тепер виконуються при кожному старті. Змінну можна видалити. */
  @Transform(toBoolean)
  @IsBoolean()
  DB_RUN_MIGRATIONS: boolean = false;

  /**
   * Не виконувати міграції при старті (для кількох реплік: тоді міграції запускає окремий крок `npm run migration:run`).
   * За замовчуванням false: невиконані міграції застосовуються автоматично й пишуться в лог.
   */
  @Transform(toBoolean)
  @IsBoolean()
  SKIP_MIGRATIONS: boolean = false;

  /**
   * Заповнювати довідник вправ при старті (лише ДОДАЄ відсутні за slug, наявні не чіпає).
   * Потрібно на Railway, де немає ts-node для `npm run seed`. Вимкнути: SEED_ON_BOOT=false.
   */
  @Transform(toBoolean)
  @IsBoolean()
  SEED_ON_BOOT: boolean = true;

  /**
   * Вхід через Google (Gmail): OAuth Client ID, через кому — web, Android та iOS (Google Cloud Console →
   * Credentials). ID-токен від Google приймається, лише якщо його `aud` — один із цих ID. Порожньо = вхід вимкнено.
   */
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_IDS?: string;

  // ───── Auth ─────
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS: number = 30;

  /** «Перець» для HMAC-SHA256 хешів OTP та refresh-токенів */
  @IsString()
  @MinLength(32)
  TOKEN_HASH_SECRET: string;

  // ───── SMS ─────
  @IsEnum(SmsProviderName)
  SMS_PROVIDER: SmsProviderName = SmsProviderName.CONSOLE;

  @IsOptional() @IsString() TWILIO_ACCOUNT_SID?: string;
  @IsOptional() @IsString() TWILIO_AUTH_TOKEN?: string;
  @IsOptional() @IsString() TWILIO_MESSAGING_SERVICE_SID?: string;
  @IsOptional() @IsString() TWILIO_FROM_NUMBER?: string;

  /** SMSAPI.com → Settings → API tokens (OAuth): токен із правом SMS */
  @IsOptional() @IsString() SMSAPI_TOKEN?: string;

  /**
   * Ім'я відправника (до 11 латинських символів), зареєстроване й підтверджене в SMSAPI → Sender names.
   * Порожньо — ім'я за замовчуванням вашого акаунта SMSAPI.
   */
  @IsOptional() @IsString() SMSAPI_SENDER?: string;

  /** Адреса API: https://api.smsapi.com (акаунт на smsapi.com) або https://api.smsapi.pl (акаунт на smsapi.pl) */
  @IsString() SMSAPI_URL: string = 'https://api.smsapi.com';

  // ───── Адмінка (CRM) ─────
  /** Єдиний адмін-акаунт CRM: логін (пошта). Без ADMIN_EMAIL/ADMIN_PASSWORD адмінка вимкнена. */
  @IsOptional()
  @IsString()
  ADMIN_EMAIL?: string;

  /** Пароль адміна (мінімум 10 символів). Зміна пароля одразу анулює всі видані адмін-токени. */
  @IsOptional()
  @IsString()
  @MinLength(10)
  ADMIN_PASSWORD?: string;

  /** Секрет підпису адмін-JWT; без нього виводиться з JWT_ACCESS_SECRET (окремий від користувацьких токенів) */
  @IsOptional()
  @IsString()
  @MinLength(32)
  ADMIN_JWT_SECRET?: string;

  /** Домени CRM, яким дозволено звертатися до API з браузера (через кому), напр. https://admin.example.com */
  @IsOptional()
  @IsString()
  ADMIN_CORS_ORIGINS?: string;

  /** Хто надсилає листи: console (лист друкується в лозі, dev) або resend (справжні листи) */
  @IsEnum(EmailProviderName)
  EMAIL_PROVIDER: EmailProviderName = EmailProviderName.CONSOLE;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  /**
   * Адреса відправника на ВАШОМУ підтвердженому в Resend домені, напр. `auth@mail.your-domain.com`
   * (як MAIL_FROM в інших проєктах). Ім'я відправника — MAIL_FROM_NAME.
   */
  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  /** Ім'я відправника в листах («Книжка турботи <auth@…>») */
  @IsString()
  MAIL_FROM_NAME: string = 'Книжка турботи';

  /**
   * Старий формат (повний відправник «Ім'я <адреса>»). Використовується, лише якщо MAIL_FROM не задано.
   * `onboarding@resend.dev` — тестовий відправник Resend: шле тільки на адресу власника акаунта Resend.
   */
  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  // ───── Гроші: Stripe (поповнення фонду, автопоповнення, виплати через Connect) ─────
  /** Dashboard → Developers → API keys. sk_test_… для тестів, sk_live_… для бойового режиму. Порожньо = оплати вимкнено */
  @IsOptional() @IsString() STRIPE_SECRET_KEY?: string;

  /** pk_test_… / pk_live_… — віддається застосунку для PaymentSheet */
  @IsOptional() @IsString() STRIPE_PUBLISHABLE_KEY?: string;

  /** Developers → Webhooks → endpoint `/api/v1/payments/webhooks/stripe` (події вашого акаунта) → Signing secret whsec_… */
  @IsOptional() @IsString() STRIPE_WEBHOOK_SECRET?: string;

  /** Той самий endpoint, але «Events on Connected accounts» (account.updated) → окремий whsec_… */
  @IsOptional() @IsString() STRIPE_CONNECT_WEBHOOK_SECRET?: string;

  /** Країна платформи (для Apple Pay / Google Pay у PaymentSheet), ISO 3166-1 alpha-2 */
  @IsString() STRIPE_MERCHANT_COUNTRY: string = 'PL';

  /** Країна Connect-акаунта батька/матері за замовчуванням (якщо не визначено з номера телефону) */
  @IsString() STRIPE_CONNECT_DEFAULT_COUNTRY: string = 'PL';

  /** Ім'я продавця в PaymentSheet / у виписці */
  @IsString() STRIPE_MERCHANT_NAME: string = 'Książeczka troski';

  // ───── Підписка: App Store / Google Play (лише монетизація, не гроші сім'ї) ─────
  /** Bundle ID застосунку iOS (напр. com.healthyflexy.app). Порожньо = перевірка покупок App Store вимкнена */
  @IsOptional() @IsString() APPLE_BUNDLE_ID?: string;

  /** Apple ID застосунку (число з App Store Connect) — обов'язковий для Production */
  @IsOptional() @Type(() => Number) @IsInt() APPLE_APP_ID?: number;

  /** Sandbox або Production */
  @IsString() APPLE_IAP_ENVIRONMENT: string = 'Sandbox';

  /** Папка з кореневими сертифікатами Apple (AppleRootCA-G3.cer тощо з apple.com/certificateauthority) */
  @IsOptional() @IsString() APPLE_ROOT_CERTS_DIR?: string;

  /** applicationId Android-застосунку. Порожньо = перевірка покупок Google Play вимкнена */
  @IsOptional() @IsString() GOOGLE_PLAY_PACKAGE_NAME?: string;

  /** JSON ключа сервісного акаунта Google Cloud з доступом до Play Console (Financial data / Manage orders) */
  @IsOptional() @IsString() GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;

  /** Секрет у URL push-підписки Pub/Sub для RTDN: `/api/v1/subscriptions/google/rtdn?token=…` */
  @IsOptional() @IsString() GOOGLE_RTDN_TOKEN?: string;

  // ───── AI (vision-аналіз скріншотів вправи) ─────
  /** stub (детермінований результат, без ключа) або openai (GPT-4o Vision, потрібен OPENAI_API_KEY) */
  @IsEnum(AiProviderName)
  AI_PROVIDER: AiProviderName = AiProviderName.STUB;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsString()
  AI_MODEL: string = 'gpt-4o';

  /** Мінімальний score (0-100), нижче якого спроба вважається неприйнятою навіть якщо isCorrect=true */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  AI_SCORE_THRESHOLD: number = 60;

  // ───── Storage (S3-compatible) ─────
  /**
   * Сховище кадрів. `local` — файли на диску сервера (dev / один інстанс із volume);
   * `s3` — S3-сумісне (AWS S3 / Cloudflare R2). Перемикання — лише цією змінною, код не змінюється.
   */
  @IsEnum(StorageDriver)
  STORAGE_DRIVER: StorageDriver = StorageDriver.LOCAL;

  @IsString()
  STORAGE_LOCAL_DIR: string = './storage';

  /**
   * Країни, на які дозволено надсилати SMS (ISO-коди через кому). Захист від SMS-шахрайства й неочікуваних витрат
   * (ТЗ §5.4: Geo Permissions). Порожньо = без обмежень. Той самий список варто виставити в Twilio.
   */
  @IsString()
  SMS_ALLOWED_COUNTRIES: string = 'PL,UA';

  /** Ключ для підпису локальних URL. Якщо не задано — береться TOKEN_HASH_SECRET */
  @IsOptional() @IsString() STORAGE_SIGNING_SECRET?: string;

  /**
   * Зовнішня адреса API: у неї клієнт ходить за підписаними URL локального сховища.
   * ОБОВ'ЯЗКОВО зі схемою (http:// або https://) — без неї клієнт отримає непридатний upload-URL
   * (телефон не може відкрити адресу без схеми) і кадри вправ мовчки не будуть завантажені.
   */
  @IsString()
  @Matches(/^https?:\/\//, {
    message: 'PUBLIC_BASE_URL must start with http:// or https:// (got a schemeless host)',
  })
  PUBLIC_BASE_URL: string = 'http://localhost:3000';

  @IsOptional() @IsString() S3_ENDPOINT?: string;
  @IsString() S3_REGION: string = 'eu-central-1';
  @IsOptional() @IsString() S3_BUCKET_PHOTOS?: string;
  @IsOptional() @IsString() S3_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() S3_SECRET_ACCESS_KEY?: string;

  @Transform(toBoolean)
  @IsBoolean()
  S3_FORCE_PATH_STYLE: boolean = false;

  /** pretty — для розробки, json — структурований лог для Railway/Loki */
  @IsEnum(LogFormat)
  LOG_FORMAT: LogFormat = LogFormat.PRETTY;

  @IsOptional() @IsString() DEMO_VIDEOS_BASE_URL?: string;

  // ───── Push ─────
  @IsOptional() @IsString() EXPO_ACCESS_TOKEN?: string;

  // ───── Throttling ─────
  @Type(() => Number) @IsInt() @Min(1) THROTTLE_TTL_MS: number = 60000;
  @Type(() => Number) @IsInt() @Min(1) THROTTLE_LIMIT: number = 120;

  // ───── Monitoring ─────
  @IsOptional() @IsString() SENTRY_DSN?: string;
}

/** Передається в ConfigModule.forRoot({ validate }) */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  • ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  if (validated.STORAGE_DRIVER === StorageDriver.S3 && !validated.S3_BUCKET_PHOTOS) {
    throw new Error(
      'Invalid environment configuration:\n  • S3_BUCKET_PHOTOS is required when STORAGE_DRIVER=s3',
    );
  }
  if (validated.AI_PROVIDER === AiProviderName.OPENAI && !validated.OPENAI_API_KEY) {
    throw new Error(
      'Invalid environment configuration:\n  • OPENAI_API_KEY is required when AI_PROVIDER=openai',
    );
  }
  return validated;
}
