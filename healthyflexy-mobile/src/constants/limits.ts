/** Дзеркало backend `common/constants/app.constants.ts` — лише те, що потрібно UI. */
export const OTP = {
  LENGTH: 6,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

export const INVITE = {
  CODE_LENGTH: 6,
  /** Без схожих символів: 0 O 1 I L */
  CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  TTL_DAYS: 7,
} as const;

export const PLAN = {
  RATE_MIN: 1,
  RATE_MAX: 20,
  RATE_STEP: 0.5,
  DEFAULT_RATE: 5,
  DEFAULT_PLAN_DAYS: [1, 2, 4, 5],
  DEFAULT_REMINDER_TIME: '10:00',
  WEEKS_PER_MONTH: 4.33,
  /** «Час тренування» (макет): 5–60 хв, крок 5; 10–25 хв — рекомендовано для початкового рівня */
  WORKOUT_MINUTES_MIN: 5,
  WORKOUT_MINUTES_MAX: 60,
  WORKOUT_MINUTES_STEP: 5,
  DEFAULT_WORKOUT_MINUTES: 15,
  /** «Автоускладнення»: темп зростання, % на тиждень */
  PROGRESSION_PCT_MIN: 1,
  PROGRESSION_PCT_MAX: 100,
  DEFAULT_PROGRESSION_PCT: 5,
  LEVEL_MAX: 5,
} as const;

/**
 * Кадри вправи. Відео ніде не зберігається: застосунок непомітно робить 24 кадри, стискає й завантажує;
 * сервер складає з них розкадровку для AI (рух оцінюється відрізками часу, а не по одному кадру).
 */
export const PHOTO = {
  FRAMES: 24,
  /** Менше кадрів (камера збоїла) — сервер відхилить (PHOTOS_REQUIRED), тож одразу просимо пересняти */
  MIN_FRAMES: 12,
  RETENTION_DAYS: 7,
  /** Верхня межа розміру одного кадру на сервері */
  MAX_BYTES: 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg'],
  /** Стиснення перед відправкою: ширина 480 px, JPEG 55% → ~30–50 КБ (у розкадровці кадр 240×320 — запас удвічі) */
  TARGET_WIDTH: 480,
  JPEG_QUALITY: 0.55,
  UPLOAD_URL_TTL_SECONDS: 15 * 60,
  VIEW_URL_TTL_SECONDS: 60 * 60,
  /** «Завершити» активне після мінімум 5 с (ТЗ §6.3) */
  MIN_SECONDS_BEFORE_FINISH: 5,
  /** Підказки змінюються кожні 6 с (5 підказок) */
  HINT_INTERVAL_SECONDS: 6,
} as const;

/** Крокомір */
export const STEPS = {
  /** Денна ціль картки «Кроки сьогодні» (як у макеті) */
  DAILY_GOAL: 7500,
} as const;

export const PROFILE = {
  NAME_MAX: 100,
  AGE_MIN: 16,
  AGE_MAX: 120,
} as const;

/** Нагадування дитини батьку — не частіше ніж раз на 2 години */
export const REMINDER = {
  COOLDOWN_HOURS: 2,
} as const;

export const LEDGER = {
  PAGE_SIZE: 20,
} as const;

export const TIME = {
  ACCESS_TOKEN_REFRESH_MARGIN_SECONDS: 30,
} as const;

/** Дашборд дитини: скільки останніх днів показувати відео */
export const DASHBOARD_RECENT_DAYS = 7;
