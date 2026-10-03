import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { isAxiosError } from 'axios';
import { env } from '@/config/env';
import { ASYNC_KEYS } from '@/constants/storage-keys';
import type { AuthTokens, User, UserRole } from '@/types';
import { getAccountToken, getRefreshToken, removeAccountToken, saveAccountToken } from './token-storage';

/**
 * Акаунти, у які входили на цьому пристрої (перемикач «Батько / Дитина» у профілі).
 * Метадані (ім'я, роль, контакт) — в AsyncStorage; refresh-токен кожного акаунта — окремо в SecureStore.
 * Токен дзеркалиться при кожному оновленні сесії: сервер відкликає ВСІ токени, якщо повторно використати
 * старий, тож збережений токен завжди має бути найсвіжішим.
 */
export interface SavedAccount {
  userId: string;
  name: string | null;
  role: UserRole | null;
  /** Телефон або пошта — щоб відрізнити тестові акаунти */
  contact: string;
  lastUsedAt: string;
}

export async function listSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_KEYS.savedAccounts);
    const list = raw ? (JSON.parse(raw) as SavedAccount[]) : [];
    return list.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  } catch {
    return [];
  }
}

async function writeAccounts(list: SavedAccount[]): Promise<void> {
  await AsyncStorage.setItem(ASYNC_KEYS.savedAccounts, JSON.stringify(list));
}

/** Після входу/старту сесії: запам'ятати акаунт і його поточний refresh-токен */
export async function rememberAccount(user: User): Promise<void> {
  const token = await getRefreshToken();
  if (token) await saveAccountToken(user.id, token);
  const list = (await listSavedAccounts()).filter((a) => a.userId !== user.id);
  list.push({
    userId: user.id,
    name: user.name,
    role: user.role,
    contact: user.phone ?? user.email ?? '',
    lastUsedAt: new Date().toISOString(),
  });
  await writeAccounts(list);
}

/** Сесію поточного акаунта оновлено (новий refresh-токен) — оновити й збережену копію */
export async function syncAccountToken(userId: string, refreshToken: string): Promise<void> {
  if ((await listSavedAccounts()).some((a) => a.userId === userId)) await saveAccountToken(userId, refreshToken);
}

export async function forgetAccount(userId: string): Promise<void> {
  await removeAccountToken(userId);
  await writeAccounts((await listSavedAccounts()).filter((a) => a.userId !== userId));
}

/**
 * Нова сесія для збереженого акаунта: обмін його refresh-токена на свіжу пару (без коду з SMS/пошти).
 * null — токен більше не дійсний (вийшли на всіх пристроях, акаунт видалено): акаунт прибирається зі списку.
 */
export async function refreshSavedAccount(userId: string): Promise<AuthTokens | null> {
  const token = await getAccountToken(userId);
  if (!token) {
    await forgetAccount(userId);
    return null;
  }
  try {
    const { data } = await axios.post<AuthTokens>(`${env.apiUrl}/auth/refresh`, { refreshToken: token }, { timeout: 20_000 });
    await saveAccountToken(userId, data.refreshToken);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response && error.response.status < 500) await forgetAccount(userId);
    return null;
  }
}
