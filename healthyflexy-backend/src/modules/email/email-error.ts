export interface EmailFailure {
  provider: string;
  status?: number;
  code?: string;
  message: string;
  hint?: string;
}

/** Розбирає помилку Resend в структуру для логу й додає підказку, що виправити */
export function describeEmailError(provider: string, error: unknown): EmailFailure {
  const e = error as { status?: number; code?: string; message?: string; name?: string };
  const message = e.message ?? 'unknown error';
  const lower = message.toLowerCase();
  let hint: string | undefined;
  if (lower.includes('api key') || e.status === 401) {
    hint = 'Невірний RESEND_API_KEY (Resend → API Keys). Ключ має починатися з re_.';
  } else if (lower.includes('own email') || lower.includes('testing emails')) {
    hint =
      'Без підтвердженого домену Resend шле лише на адресу ВЛАСНИКА акаунта. Додайте домен (Resend → Domains) або тестуйте з адресою акаунта.';
  } else if (
    lower.includes('domain') &&
    (lower.includes('not verified') || lower.includes('verify'))
  ) {
    hint =
      'Домен відправника не підтверджено: Resend → Domains → додайте DNS-записи (SPF, DKIM), дочекайтесь Verified і перевірте MAIL_FROM.';
  } else if (e.status === 422) {
    hint =
      'Resend відхилив дані листа: перевірте MAIL_FROM (адреса на підтвердженому домені) і адресу отримувача.';
  } else if (lower.includes('not allowed in production')) {
    hint =
      'У production листи шле лише Resend: EMAIL_PROVIDER=resend + RESEND_API_KEY + MAIL_FROM.';
  } else if (lower.includes('resend_api_key')) {
    hint = 'Не задано RESEND_API_KEY (Resend → API Keys, ключ починається з re_).';
  } else if (e.status === 429) {
    hint = 'Перевищено ліміт запитів Resend: зачекайте або перегляньте план.';
  } else if (message === 'The operation was aborted due to timeout' || e.name === 'TimeoutError') {
    hint = 'Resend не відповів за 10 с: перевірте мережу сервера.';
  }
  return {
    provider,
    ...(e.status ? { status: e.status } : {}),
    ...(e.code ? { code: e.code } : {}),
    message,
    ...(hint ? { hint } : {}),
  };
}
