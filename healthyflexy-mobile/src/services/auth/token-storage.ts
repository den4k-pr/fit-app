import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_KEYS } from '@/constants/storage-keys';

/** Access-токен живе лише в пам'яті (15 хв); refresh-токен — у Keychain/Keystore через SecureStore. */
/**
 * SecureStore (Keychain / Keystore) — лише на пристроях. У web-збірці (перегляд/тести в браузері) — localStorage.
 * Продакшн-застосунок web не має, тож токени завжди лежать у захищеному сховищі ОС.
 */
const secure = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getRefreshToken = (): Promise<string | null> =>
  secure.get(SECURE_KEYS.refreshToken);
export const saveRefreshToken = (token: string): Promise<void> =>
  secure.set(SECURE_KEYS.refreshToken, token);

/** Refresh-токен збереженого акаунта (перемикач акаунтів у профілі) */
export const getAccountToken = (userId: string): Promise<string | null> =>
  secure.get(`${SECURE_KEYS.accountTokenPrefix}${userId}`);
export const saveAccountToken = (userId: string, token: string): Promise<void> =>
  secure.set(`${SECURE_KEYS.accountTokenPrefix}${userId}`, token);
export const removeAccountToken = (userId: string): Promise<void> =>
  secure.remove(`${SECURE_KEYS.accountTokenPrefix}${userId}`);

export async function clearTokens(): Promise<void> {
  accessToken = null;
  await secure.remove(SECURE_KEYS.refreshToken);
}

/** Стабільний ідентифікатор інсталяції (для refresh-токенів на сервері). Генерується один раз. */
export async function getDeviceId(): Promise<string> {
  const existing = await secure.get(SECURE_KEYS.deviceId);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await secure.set(SECURE_KEYS.deviceId, id);
  return id;
}
