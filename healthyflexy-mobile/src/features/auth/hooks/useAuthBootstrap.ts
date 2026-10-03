import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/gateway';
import { isApiError } from '@/api/errors';
import { refreshOnce } from '@/api/interceptors';
import { checkFamily, establishSession } from '@/services/auth/session';
import { beginSession } from '@/services/auth/sign-out';
import { clearTokens, getRefreshToken } from '@/services/auth/token-storage';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useSettingsStore } from '@/store/settings.store';

/**
 * `establishSession` читає `useOnboardingStore.getState().consentAcceptedAt` (persist з AsyncStorage,
 * асинхронна гідратація). Без цього очікування на швидкому перезапуску (токен уже є, стор ще не встиг
 * гідруватись) перевірка бачить `null` замість збереженої згоди, POST /users/me/consent НЕ йде на сервер,
 * а користувач лишається назавжди заблокованим на PUT /users/me/role → 403 CONSENT_REQUIRED (екран згоди
 * вдруге не показується, адже локально consentAcceptedAt уже true).
 */
function waitForOnboardingHydration(): Promise<void> {
  if (useOnboardingStore.getState().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useOnboardingStore.subscribe((state) => {
      if (state.hydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/** Обрана дитиною сім'я (`X-Family-Id`) має бути прочитана з диска ДО першого запиту — інакше сервер віддасть іншу */
function waitForSettingsHydration(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

const isNetworkFailure = (error: unknown) => !isApiError(error) || error.status === 0 || error.status >= 500;

/** Одна спроба відновити сесію. `offline` — немає зв'язку / сервер недоступний (сесія лишається) */
async function restoreSession(isAlive: () => boolean): Promise<'done' | 'offline'> {
  try {
    await Promise.all([waitForOnboardingHydration(), waitForSettingsHydration()]);
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      if (isAlive()) useAuthStore.getState().setSignedOut();
      return 'done';
    }
    beginSession();
    const outcome = await refreshOnce();
    if (outcome === 'rejected') {
      await clearTokens();
      if (isAlive()) useAuthStore.getState().setSignedOut();
      return 'done';
    }
    if (outcome === 'network') return 'offline';
    // сім'я — паралельно з профілем (без ролі сервер відповість 403 — тоді її просто немає)
    const [user, hasFamily] = await Promise.all([api.users.getMe(), checkFamily().catch(() => null)]);
    if (isAlive()) await establishSession(user, { isNewUser: false, hasFamily: hasFamily ?? undefined });
    return 'done';
  } catch (error) {
    if (isNetworkFailure(error)) return 'offline';
    if (isAlive()) useAuthStore.getState().setSignedOut();
    return 'done';
  }
}

/**
 * Старт застосунку (ТЗ §5.4: «повторний вхід не потрібен»): немає refresh-токена → екрани входу;
 * є → спершу оновлення сесії (access-токен живе лише в пам'яті — раніше перший запит ЗАВЖДИ отримував 401
 * і повторювався), далі паралельно «хто я» + сім'я, потім згода/таймзона/мова (`establishSession`).
 * Немає зв'язку чи сервер недоступний → `offline` (екран «Спробувати ще раз»), а НЕ вихід з акаунта:
 * раніше будь-яка мережева помилка на старті викидала на екран входу.
 */
export function useAuthBootstrap(): { isReady: boolean; offline: boolean; checking: boolean; retry: () => void } {
  const status = useAuthStore((s) => s.status);
  const [offline, setOffline] = useState(false);
  // перша перевірка стартує одразу; повтор вмикає прапорець сам (див. retry)
  const [checking, setChecking] = useState(true);
  const alive = useRef(true);

  const attempt = useCallback(() => {
    void restoreSession(() => alive.current).then((result) => {
      if (!alive.current) return;
      setOffline(result === 'offline');
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    attempt();
    return () => {
      alive.current = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setChecking(true);
    attempt();
  }, [attempt]);
  const stillOffline = offline && status === 'loading';
  return { isReady: status !== 'loading' || stillOffline, offline: stillOffline, checking, retry };
}
