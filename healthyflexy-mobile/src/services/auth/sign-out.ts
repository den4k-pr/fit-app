import { queryClient } from '@/api/query-client';
import { useAuthStore } from '@/store/auth.store';
import { useExerciseFlowStore } from '@/store/exercise-flow.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useSettingsStore } from '@/store/settings.store';
import { forgetAccount } from './saved-accounts';
import { clearTokens } from './token-storage';

/**
 * Кеш запитів чистимо, коли екрани попереднього акаунта вже розмонтовано (перехід на вхід ~0,3 с).
 * Раніше кеш очищувався ДО переходу: змонтовані екрани рендерились без даних і одразу слали запити без
 * токена (401 → refresh → повторний вихід), а `router.replace` конфліктував з переходом, який робить
 * `Stack.Protected` — звідси «зависання» й вильоти при виході / видаленні акаунта.
 */
const CACHE_CLEAR_DELAY_MS = 1000;

/** Номер сесії: відкладене очищення кешу не зачепить сесію, що встигла початися після виходу */
let generation = 0;

/** Новий вхід: попередні відкладені очищення кешу вже не актуальні */
export function beginSession(): void {
  generation += 1;
}

export interface SignOutOptions {
  /** Прибрати акаунт і з перемикача акаунтів (вихід, видалення) */
  forgetUserId?: string;
  /** Видалення акаунта: скинути й онбординг (згода, перший план) */
  resetOnboarding?: boolean;
}

/**
 * Єдиний локальний вихід (вихід, видалення акаунта, «+ Додати акаунт», сесію відкликано на сервері):
 * зупинити запити → токени й стан акаунта → `signedOut`. Навігацію НЕ робимо: guard'и `Stack.Protected`
 * самі переводять на `/` → екрани входу.
 */
export async function signOutLocally(options: SignOutOptions = {}): Promise<void> {
  generation += 1;
  const mine = generation;
  await queryClient.cancelQueries();
  if (options.forgetUserId) await forgetAccount(options.forgetUserId).catch(() => undefined);
  await clearTokens().catch(() => undefined);
  useExerciseFlowStore.getState().reset();
  if (options.resetOnboarding) useOnboardingStore.getState().reset();
  else useOnboardingStore.getState().resetAccountState();
  useSettingsStore.getState().setActiveFamilyId(null);
  useAuthStore.getState().setSignedOut();
  setTimeout(() => {
    if (generation === mine && useAuthStore.getState().status === 'signedOut') queryClient.clear();
  }, CACHE_CLEAR_DELAY_MS);
}
