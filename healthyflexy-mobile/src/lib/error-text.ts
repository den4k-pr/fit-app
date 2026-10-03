import type { TFunction } from 'i18next';
import { toApiError } from '@/api/errors';
import { env } from '@/config/env';

/**
 * Текст помилки для людини (`errors.<CODE>`). У dev-збірці до «немає з'єднання» додаємо адресу сервера,
 * щоб одразу було видно, куди саме застосунок намагався підключитися.
 */
export function errorText(t: TFunction, error: unknown): string {
  const { code } = toApiError(error);
  const base = t(`errors.${code}`);
  return __DEV__ && code === 'NETWORK_ERROR' ? `${base}\n(${env.apiUrl})` : base;
}
