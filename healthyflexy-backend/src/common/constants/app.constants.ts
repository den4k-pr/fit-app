/**
 * Єдине місце для «магічних чисел» з ТЗ v3.0.
 * Клієнт дублює релевантні значення у `src/constants/limits.ts` (мобільний застосунок).
 */

/** OTP. ТЗ §5.4 задає лише паузу 60 с; TTL, ліміти спроб і запитів обрано при проєктуванні (проти SMS-pumping). */
export const OTP = {
  LENGTH: 6,
  TTL_SECONDS: 300,
  /** Скільки невірних вводів дозволено для одного коду */
  MAX_VERIFY_ATTEMPTS: 5,
  /** Мінімальна пауза між запитами коду для одного номера */
  RESEND_COOLDOWN_SECONDS: 60,
  /** Вікно та ліміт запитів коду для одного номера (захист від SMS-pumping) */
  REQUEST_WINDOW_MINUTES: 10,
  MAX_REQUESTS_PER_WINDOW: 5,
} as const;

/** Токени */
export const TOKENS = {
  /** Довжина випадкового refresh-токена в байтах (256 біт) */
  REFRESH_TOKEN_BYTES: 32,
} as const;

/** Запрошення (розділ 5.5 ТЗ) */
export const INVITE = {
  CODE_LENGTH: 6,
  /** Без схожих символів: 0 O 1 I L */
  CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  TTL_DAYS: 7,
} as const;

/** План та ставка (розділ 7.2 ТЗ) */
export const PLAN = {
  RATE_MIN: 1,
  RATE_MAX: 20,
  RATE_STEP: 0.5,
  DEFAULT_RATE: 5,
  DEFAULT_PLAN_DAYS: [1, 2, 4, 5],
  DEFAULT_REMINDER_TIME: '10:00',
  WEEKS_PER_MONTH: 4.33,
  /** «Час тренування» (макет): середня тривалість дня без урахування ходьби, хв */
  WORKOUT_MINUTES_MIN: 5,
  WORKOUT_MINUTES_MAX: 60,
  WORKOUT_MINUTES_STEP: 5,
  DEFAULT_WORKOUT_MINUTES: 15,
  /** «Автоускладнення»: темп зростання цілей вправ, % на тиждень */
  PROGRESSION_PCT_MIN: 1,
  PROGRESSION_PCT_MAX: 100,
  DEFAULT_PROGRESSION_PCT: 5,
  /** Стеля автоускладнення: цілі не більше ніж удвічі від базових */
  PROGRESSION_MAX_FACTOR: 2,
  /** Рівень 1–5 у профілі батька/матері (за досягнутим множником цілей) */
  LEVEL_MAX: 5,
  /** Скільки сімей (батьків) може мати одна дитина */
  MAX_FAMILIES_PER_CHILD: 6,
  /** Підпис, яким дитина називає батька/матір («Мама», «Бабуся Олена») */
  PARENT_LABEL_MAX: 40,
} as const;

/**
 * Фото вправи (розділ 8.6 ТЗ, редакція «кадри замість відео»).
 * Відео НЕ зберігається ніде: застосунок сам робить 24 кадри під час вправи, стискає їх і завантажує.
 * Кадри видаляються через RETENTION_DAYS (запис вправи лишається, `photos_deleted_at`).
 */
export const PHOTO = {
  RETENTION_DAYS: 7,
  /** Скільки кадрів робить застосунок за вправу (рівномірно по часу вправи) */
  FRAMES_PER_EXERCISE: 24,
  /** Менше кадрів (камера збоїла) — аналіз ненадійний, спроба відхиляється до виклику AI */
  MIN_FRAMES_FOR_ANALYSIS: 12,
  /** Клієнт стискає до ~720 px / ~150 КБ; верхня межа з запасом */
  MAX_BYTES: 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg'],
  UPLOAD_URL_TTL_SECONDS: 15 * 60,
  VIEW_URL_TTL_SECONDS: 60 * 60,
} as const;

/** Фото-аватари (JPEG, клієнт стискає до ~400 px) */
export const AVATAR = {
  MAX_BYTES: 512 * 1024,
  /** Посилання на аватар живе добу: застосунок кешує картинку */
  VIEW_URL_TTL_SECONDS: 24 * 60 * 60,
} as const;

/** Вправи на кроки (крокомір телефона) */
export const STEPS = {
  /** Верхня межа, яку приймає сервер за одну вправу (захист від сміттєвих значень) */
  MAX_PER_EXERCISE: 50_000,
} as const;

/** Нагадування дитини батьку/матері (розділ 7.1 ТЗ) */
export const REMINDER = {
  COOLDOWN_HOURS: 2,
} as const;

/** Пагінація журналу розрахунків */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

/** Календар: скільки днів у минулому показувати відео (для дашборда дитини) */
export const DASHBOARD = {
  RECENT_DAYS: 7,
} as const;

/** AI-аналіз скріншотів вправи (гериатричний модуль). */
export const AI_ANALYSIS = {
  /** Скільки кадрів надсилається на аналіз (= PHOTO.FRAMES_PER_EXERCISE) */
  PHOTOS_COUNT: 24,
  TIMEOUT_MS: 60_000,
  /**
   * Частка кадрів, де людина МАЄ бути видна (інакше — відмова незалежно від score). 0.5, а не 2/3: у вправах
   * лежачи частина тіла часто виходить за кадр або перекривається.
   */
  MIN_PERSON_VISIBLE_RATIO: 0.5,
  /** Оцінка, з якої вправа зараховується навіть при isCorrect = false (дрібні зауваження до техніки) */
  CONFIDENT_SCORE: 65,
  /**
   * Скільки платних AI-перевірок однієї вправи за день. Далі — пропозиція пропустити вправу (без оплати):
   * повтори в циклі не палять токени, а людина не застрягає на одній вправі.
   */
  MAX_ATTEMPTS_PER_EXERCISE: 5,
} as const;

/** Ключі DI */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
export const AI_PROVIDER = Symbol('AI_PROVIDER');
