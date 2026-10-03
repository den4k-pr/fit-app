/** Підказки до найчастіших помилок Twilio: що саме зробити, коли SMS не йде */
const TWILIO_HINTS: Record<number, string> = {
  20003: 'Невірні TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN (Console → Account → API keys & tokens).',
  20404: 'Не знайдено ресурс: перевірте TWILIO_ACCOUNT_SID і TWILIO_MESSAGING_SERVICE_SID.',
  21211: 'Номер отримувача недійсний. Потрібен формат E.164, наприклад +48501234567.',
  21408: 'Twilio не дозволяє SMS у цю країну: Console → Messaging → Settings → Geo permissions.',
  21606: 'TWILIO_FROM_NUMBER не може надсилати SMS (потрібен номер з SMS-можливістю).',
  21608:
    'Пробний акаунт Twilio: SMS можна слати лише на ПІДТВЕРДЖЕНІ номери (Console → Verified Caller IDs).',
  21610: 'Номер відписався від SMS (STOP).',
  21614: 'Номер отримувача не є мобільним.',
  30007: 'Оператор відхилив SMS як спам.',
  63016: 'Канал не підтримує це повідомлення.',
};

/** Коди помилок SMSAPI.com (https://www.smsapi.com/docs/#errors) → що виправити */
const SMSAPI_HINTS: Record<string, string> = {
  not_configured: 'Не задано SMSAPI_TOKEN (SMSAPI → Settings → API tokens → OAuth, право SMS).',
  smsapi_8: 'Помилка в запиті до SMSAPI (перевірте SMSAPI_URL: api.smsapi.com або api.smsapi.pl).',
  smsapi_11: 'Повідомлення задовге або порожнє.',
  smsapi_13: 'Номер отримувача недійсний або країна недоступна для вашого акаунта SMSAPI.',
  smsapi_14:
    "Ім'я відправника SMSAPI_SENDER не підтверджене (SMSAPI → Sender names) — підтвердіть або залиште порожнім.",
  smsapi_101: 'Невірний SMSAPI_TOKEN або в токена немає права на SMS.',
  smsapi_102: 'Невірний SMSAPI_TOKEN.',
  smsapi_103: 'Недостатньо коштів на рахунку SMSAPI: поповніть баланс.',
  smsapi_105: 'IP сервера заборонений у налаштуваннях SMSAPI (IP filter).',
};

export interface SmsFailure {
  provider: string;
  code?: number | string;
  status?: number;
  message: string;
  hint?: string;
}

/** Розбирає помилку провайдера (Twilio віддає code/status/moreInfo) в структуру для логу */
export function describeSmsError(provider: string, error: unknown): SmsFailure {
  const e = error as {
    code?: number | string;
    status?: number;
    message?: string;
    moreInfo?: string;
  };
  const code = typeof e.code === 'number' || typeof e.code === 'string' ? e.code : undefined;
  const hint =
    typeof code === 'number'
      ? TWILIO_HINTS[code]
      : typeof code === 'string'
        ? SMSAPI_HINTS[code]
        : undefined;
  return {
    provider,
    ...(code !== undefined ? { code } : {}),
    ...(e.status ? { status: e.status } : {}),
    message: e.message ?? 'unknown error',
    ...(hint ? { hint } : e.moreInfo ? { hint: e.moreInfo } : {}),
  };
}
