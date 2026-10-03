/**
 * Машиночитні коди помилок. Клієнт перекладає їх у людські повідомлення
 * (розділ 17 ТЗ: «помилки простою мовою»), тому тексти з бекенду показувати не можна.
 * Дзеркало: `src/types/api/common.ts` у мобільному застосунку.
 */
export enum ErrorCode {
  // Загальні
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  FORBIDDEN_ROLE = 'FORBIDDEN_ROLE',
  NOT_FOUND = 'NOT_FOUND',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // OTP / вхід
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_TOO_MANY_ATTEMPTS = 'OTP_TOO_MANY_ATTEMPTS',
  OTP_COOLDOWN = 'OTP_COOLDOWN',
  OTP_SEND_FAILED = 'OTP_SEND_FAILED',
  PHONE_COUNTRY_NOT_ALLOWED = 'PHONE_COUNTRY_NOT_ALLOWED',
  PHONE_NOT_ALLOWED = 'PHONE_NOT_ALLOWED',
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',
  /** Вхід за телефоном: SMS-сервіс на сервері ще не підключено */
  SMS_NOT_CONFIGURED = 'SMS_NOT_CONFIGURED',
  GOOGLE_AUTH_DISABLED = 'GOOGLE_AUTH_DISABLED',

  // Профіль
  ROLE_ALREADY_SET = 'ROLE_ALREADY_SET',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',

  // Сім'я та запрошення
  INVITE_INVALID = 'INVITE_INVALID',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_USED = 'INVITE_USED',
  ALREADY_IN_FAMILY = 'ALREADY_IN_FAMILY',
  FAMILY_NOT_FOUND = 'FAMILY_NOT_FOUND',
  NOT_FAMILY_MEMBER = 'NOT_FAMILY_MEMBER',
  PLAN_INVALID = 'PLAN_INVALID',

  // Вправи та дні
  REST_DAY = 'REST_DAY',
  DAY_ALREADY_CLOSED = 'DAY_ALREADY_CLOSED',
  EXERCISE_OUT_OF_ORDER = 'EXERCISE_OUT_OF_ORDER',
  EXERCISE_ALREADY_DONE = 'EXERCISE_ALREADY_DONE',
  PHOTO_KEY_INVALID = 'PHOTO_KEY_INVALID',
  PHOTO_TOO_LARGE = 'PHOTO_TOO_LARGE',
  PHOTO_TYPE_NOT_ALLOWED = 'PHOTO_TYPE_NOT_ALLOWED',
  PHOTOS_DELETED = 'PHOTOS_DELETED',
  PHOTOS_NOT_AVAILABLE = 'PHOTOS_NOT_AVAILABLE',
  STORAGE_SIGNATURE_INVALID = 'STORAGE_SIGNATURE_INVALID',
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',

  // Розрахунки
  SETTLEMENT_EXCEEDS_OWED = 'SETTLEMENT_EXCEEDS_OWED',
  SETTLEMENT_NOT_PENDING = 'SETTLEMENT_NOT_PENDING',
  NOTHING_OWED = 'NOTHING_OWED',

  // Нагадування
  REMINDER_TOO_SOON = 'REMINDER_TOO_SOON',
  REMINDER_NOT_ALLOWED = 'REMINDER_NOT_ALLOWED',
  PARENT_HAS_NO_PUSH = 'PARENT_HAS_NO_PUSH',

  // Програми тренувань та AI-аналіз
  PROGRAM_NOT_FOUND = 'PROGRAM_NOT_FOUND',
  PROGRAM_NOT_OWNED = 'PROGRAM_NOT_OWNED',
  PROGRAM_EXERCISES_EMPTY = 'PROGRAM_EXERCISES_EMPTY',
  NO_ACTIVE_PROGRAM = 'NO_ACTIVE_PROGRAM',
  AI_ANALYSIS_FAILED = 'AI_ANALYSIS_FAILED',
  /** Вичерпано спроби AI-перевірки цієї вправи на сьогодні — можна пропустити вправу */
  AI_ATTEMPTS_LIMIT = 'AI_ATTEMPTS_LIMIT',

  // Гроші: Stripe
  /** Оплати ще не підключено (немає STRIPE_SECRET_KEY) */
  PAYMENTS_DISABLED = 'PAYMENTS_DISABLED',
  /** Stripe відхилив операцію (деталі — у лозі сервера) */
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  /** Для автопоповнення потрібна збережена картка */
  PAYMENT_METHOD_REQUIRED = 'PAYMENT_METHOD_REQUIRED',
  /** Батько/мати ще не завершив налаштування виплат у Stripe */
  PAYOUTS_NOT_READY = 'PAYOUTS_NOT_READY',
  /** Сума виплати більша за доступну (зароблене, не виплачене, і реально оплачене у фонд) */
  PAYOUT_EXCEEDS_AVAILABLE = 'PAYOUT_EXCEEDS_AVAILABLE',
  /** Підписка: перевірку покупок магазину не налаштовано */
  IAP_DISABLED = 'IAP_DISABLED',
  /** Підписка: покупка не пройшла перевірку (підпис, застосунок, власник) */
  IAP_INVALID = 'IAP_INVALID',
  /** Вправа з камерою: замало кадрів (зарахування без фото більше немає) */
  PHOTOS_REQUIRED = 'PHOTOS_REQUIRED',
  /** Вправа на кроки: крокомір нарахував менше за ціль */
  STEPS_NOT_REACHED = 'STEPS_NOT_REACHED',

  // Адмінка
  ADMIN_DISABLED = 'ADMIN_DISABLED',
  ADMIN_INVALID_CREDENTIALS = 'ADMIN_INVALID_CREDENTIALS',
  SLUG_TAKEN = 'SLUG_TAKEN',
  /** Користувача заблоковано в адмінці */
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  /** Програма має більше вправ, ніж дозволено налаштуваннями */
  PROGRAM_TOO_MANY_EXERCISES = 'PROGRAM_TOO_MANY_EXERCISES',
}
