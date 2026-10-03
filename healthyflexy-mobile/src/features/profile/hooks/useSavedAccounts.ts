import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/api/gateway';
import { ApiError } from '@/api/errors';
import { ROUTES } from '@/constants/routes';
import { listSavedAccounts, refreshSavedAccount, type SavedAccount } from '@/services/auth/saved-accounts';
import { establishSession } from '@/services/auth/session';
import { beginSession, signOutLocally } from '@/services/auth/sign-out';
import { saveRefreshToken, setAccessToken } from '@/services/auth/token-storage';
import { useAuthStore } from '@/store/auth.store';
import { useExerciseFlowStore } from '@/store/exercise-flow.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useSettingsStore } from '@/store/settings.store';

const SAVED_ACCOUNTS_KEY = ['saved-accounts'] as const;

/** Акаунти, у які входили на цьому пристрої (перемикач у профілі) */
export function useSavedAccounts(): UseQueryResult<SavedAccount[]> {
  return useQuery({ queryKey: SAVED_ACCOUNTS_KEY, queryFn: listSavedAccounts, staleTime: 0 });
}

/** Скинути стан попереднього акаунта, окрім кешу запитів (його — окремо, див. нижче) */
function resetAccountScopedStores(): void {
  useExerciseFlowStore.getState().reset();
  useOnboardingStore.getState().resetAccountState();
  useSettingsStore.getState().setActiveFamilyId(null);
}

/**
 * Перейти на інший збережений акаунт без коду: його refresh-токен → нова сесія → стартовий маршрут ролі.
 * Токен недійсний (вийшли на всіх пристроях / акаунт видалено) → акаунт зникає зі списку, помилка SESSION_EXPIRED.
 *
 * Без проміжного `signedOut` (раніше: вихід → вхід → ще й `router.replace` = три переходи поспіль, звідси
 * «блимання» і збої навігації). Та сама роль — змонтовані екрани просто перезавантажують дані новим токеном;
 * інша роль — guard'и самі переводять на екрани цієї ролі, а кеш попередньої чиститься після переходу.
 */
export function useSwitchAccount(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation<void, ApiError, string>({
    mutationFn: async (userId) => {
      const tokens = await refreshSavedAccount(userId);
      if (!tokens) {
        void queryClient.invalidateQueries({ queryKey: SAVED_ACCOUNTS_KEY });
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Saved session expired');
      }
      const previousRole = useAuthStore.getState().user?.role ?? null;
      beginSession();
      await queryClient.cancelQueries();
      // напряму, не через persistTokens: той записав би новий токен у збережену копію ПОПЕРЕДНЬОГО акаунта
      setAccessToken(tokens.accessToken);
      await saveRefreshToken(tokens.refreshToken);
      resetAccountScopedStores();
      const user = await api.users.getMe();
      if (user.role === previousRole) {
        // екрани лишаються: скидаємо кеш (активні запити одразу підуть уже з новим токеном)
        queryClient.removeQueries({ type: 'inactive' });
        void queryClient.resetQueries();
        await establishSession(user, { isNewUser: false });
        // guard'и не змінились — на стартовий екран акаунта ведемо самі
        router.replace(ROUTES.root);
      } else {
        await establishSession(user, { isNewUser: false });
        // екрани попередньої ролі розмонтовуються переходом — чистимо кеш після нього
        setTimeout(() => queryClient.removeQueries({ type: 'inactive' }), 1000);
      }
    },
  });
}

/**
 * «+ Додати акаунт»: вийти ЛИШЕ локально (сесія на сервері лишається, акаунт — у списку) → екран входу.
 * Після входу новий акаунт сам з'явиться в перемикачі.
 */
export function useAddAccount(): () => Promise<void> {
  return () => signOutLocally();
}
