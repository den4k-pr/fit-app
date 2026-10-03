import axios, { isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import i18n from '@/i18n';
import { getAccessToken, getRefreshToken } from '@/services/auth/token-storage';
import { persistTokens } from '@/services/auth/session';
import { signOutLocally } from '@/services/auth/sign-out';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import type { AuthTokens } from '@/types';
import { apiClient, REQUEST_TIMEOUT_MS } from './client';
import { ApiError, toApiError } from './errors';

/**
 * Публічні маршрути: без Bearer і без refresh. Раніше тут були лише otp/refresh — і неправильний код із
 * ПОШТИ (401) запускав refresh → «сесія закінчилась» → вихід прямо на екрані входу.
 */
const PUBLIC_PATHS = [
  '/auth/otp/request',
  '/auth/otp/verify',
  '/auth/email/request',
  '/auth/email/verify',
  '/auth/phone-login',
  '/auth/config',
  '/auth/refresh',
  '/app-config',
];
const isPublic = (url?: string) => PUBLIC_PATHS.some((p) => url?.includes(p));

/** Оновлюємо access-токен наперед, якщо до кінця його життя лишилось менше за це (без зайвого 401 → повтору) */
const REFRESH_AHEAD_MS = 60_000;

type RetriableRequest = InternalAxiosRequestConfig & {
  _retried?: boolean;
  /** Не оновлювати токен для цього запиту (logout: у тілі вже лежить refresh-токен — ротація зробила б його «повторним») */
  skipAuthRefresh?: boolean;
};

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

export type RefreshOutcome = 'ok' | 'rejected' | 'network';

/** ОДИН спільний refresh на всі паралельні запити: сервер відкликає всі токени при повторному використанні старого */
let refreshing: Promise<RefreshOutcome> | null = null;

async function refreshSession(): Promise<RefreshOutcome> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return 'rejected';
  try {
    // «голий» axios: на цей запит інтерцептори не діють (інакше цикл)
    const { data } = await axios.post<AuthTokens>(`${env.apiUrl}/auth/refresh`, { refreshToken }, { timeout: REQUEST_TIMEOUT_MS });
    await persistTokens(data);
    return 'ok';
  } catch (error) {
    // сервер відповів 4xx — сесію справді відкликано; немає мережі / 5xx — токен лишається, спробуємо пізніше
    return isAxiosError(error) && error.response && error.response.status < 500 ? 'rejected' : 'network';
  }
}

/** Оновити сесію (один запит на всіх, хто просить одночасно) */
export function refreshOnce(): Promise<RefreshOutcome> {
  refreshing ??= refreshSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Коли спливає access-токен (поле `exp` JWT), мс; null — токена немає або його не розібрати */
function accessExpiresAt(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(globalThis.atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '='))) as { exp?: number };
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Свіжий access-токен перед запитом: немає в пам'яті (старт застосунку) або спливає за хвилину → refresh.
 * Раніше кожен такий запит спершу отримував 401 і лише потім повторювався — зайвий обмін із сервером.
 */
export async function ensureFreshAccess(): Promise<RefreshOutcome> {
  const expiresAt = accessExpiresAt(getAccessToken());
  if (expiresAt !== null && expiresAt - Date.now() > REFRESH_AHEAD_MS) return 'ok';
  return refreshOnce();
}

/** Сесію відкликано: вийти локально ОДИН раз (паралельні запити не запускають вихід кілька разів) */
function endSession(): void {
  if (useAuthStore.getState().status === 'signedOut') return;
  void signOutLocally();
}

/** dev: у консолі Metro видно, який запит і чому впав (немає зв'язку з сервером, код помилки) */
function logFailure(error: AxiosError, code: string): void {
  const method = error.config?.method?.toUpperCase() ?? '?';
  const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
  const reason = error.response ? `${error.response.status} ${code}` : `НЕМАЄ ЗВ'ЯЗКУ (${error.code ?? error.message})`;
  console.warn(`[api] ${method} ${url} → ${reason}`);
}

let installed = false;

/**
 * Підключається один раз у корені (`app/_layout.tsx`):
 *  • Bearer + `Accept-Language` (мова SMS/помилок) + `x-request-id` (той самий id у логах сервера)
 *    + `X-Family-Id` (обрана дитиною сім'я, коли батьків кілька);
 *  • access-токен оновлюється НАПЕРЕД (за `exp`); 401 → один спільний refresh → повтор; сервер відкликав
 *    сесію → один локальний вихід (екрани входу); немає мережі → помилка, але сесія лишається;
 *  • після виходу приватні запити екранів, що ще розмонтовуються, в мережу не йдуть;
 *  • будь-яка помилка → ApiError із кодом (`t('errors.<CODE>')`).
 */
export function installApiInterceptors(): void {
  if (installed) return;
  installed = true;

  apiClient.interceptors.request.use(async (config) => {
    const request = config as RetriableRequest;
    if (!isPublic(config.url)) {
      if (useAuthStore.getState().status === 'signedOut' && !getAccessToken()) {
        // вийшли з акаунта: запит розмонтовуваного екрана не має куди йти
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Signed out');
      }
      if (!request.skipAuthRefresh && (await ensureFreshAccess()) === 'rejected') {
        endSession();
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      const token = getAccessToken();
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers.set('Accept-Language', i18n.language);
    // дитина з кількома батьками: сім'я, обрана в перемикачі
    const familyId = useSettingsStore.getState().activeFamilyId;
    if (familyId) config.headers.set('X-Family-Id', familyId);
    config.headers.set('x-request-id', `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError | ApiError) => {
      if (error instanceof ApiError) throw error; // відхилено ще до мережі (див. request-інтерцептор)
      const original = error.config as RetriableRequest | undefined;
      if (error.response?.status === 401 && original && !original._retried && !original.skipAuthRefresh && !isPublic(original.url)) {
        original._retried = true;
        const outcome = await refreshOnce();
        if (outcome === 'ok') {
          original.headers.set('Authorization', `Bearer ${getAccessToken() ?? ''}`);
          return apiClient(original);
        }
        if (outcome === 'rejected') endSession();
      }
      const apiError = toApiError(error);
      if (__DEV__) logFailure(error, apiError.code);
      throw apiError;
    },
  );
}
