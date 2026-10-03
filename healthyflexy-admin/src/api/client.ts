import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/** Прод-API по умолчанию: пустая или незаданная VITE_API_URL не должна отправлять запросы на сам сайт CRM */
const PRODUCTION_API = 'https://healthyflexy-backend-production.up.railway.app/api/v1';
const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = (fromEnv && /^https?:\/\//.test(fromEnv) ? fromEnv : PRODUCTION_API).replace(/\/$/, '');

const STORAGE_KEY = 'hf-admin-tokens';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStore = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(tokens: Tokens | null) {
    try {
      if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // приватний режим браузера: сесія житиме до перезавантаження сторінки
    }
    listeners.forEach((l) => l(tokens));
  },
};

const listeners = new Set<(t: Tokens | null) => void>();
export const onTokensChange = (l: (t: Tokens | null) => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const api = axios.create({ baseURL: `${API_URL}/admin`, timeout: 30000 });

api.interceptors.request.use((config) => {
  const tokens = tokenStore.get();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens) return null;
  try {
    const res = await axios.post<Tokens>(`${API_URL}/admin/auth/refresh`, { refreshToken: tokens.refreshToken });
    tokenStore.set({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    return res.data.accessToken;
  } catch {
    tokenStore.set(null);
    return null;
  }
}

// 401 → один спільний refresh і повтор запиту; не вдалося → вихід
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._retried || original.url?.includes('/auth/')) {
    throw error;
  }
  original._retried = true;
  refreshing ??= refreshAccess().finally(() => {
    refreshing = null;
  });
  const access = await refreshing;
  if (!access) throw error;
  original.headers.Authorization = `Bearer ${access}`;
  return api(original);
});

/** Людське повідомлення з помилки API */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string; code?: string; details?: Record<string, string[]> } | undefined;
    if (body?.details) return Object.values(body.details).flat().slice(0, 3).join('; ');
    if (body?.code === 'ADMIN_INVALID_CREDENTIALS') return 'Неверная почта или пароль';
    if (body?.code === 'ADMIN_DISABLED') return 'Вход администратора отключен: на сервере не заданы ADMIN_EMAIL / ADMIN_PASSWORD';
    if (body?.code === 'TOO_MANY_REQUESTS') return 'Слишком много попыток. Подождите минуту';
    if (body?.message && body.message !== body.code) return body.message;
    if (!error.response) return 'Сервер недоступен. Проверьте интернет или адрес API';
    return `Ошибка ${error.response.status}`;
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}
