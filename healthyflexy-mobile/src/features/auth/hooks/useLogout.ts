import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { ensureFreshAccess } from '@/api/interceptors';
import { signOutLocally } from '@/services/auth/sign-out';
import { getRefreshToken } from '@/services/auth/token-storage';
import { useAuthStore } from '@/store/auth.store';

export interface LogoutInput {
  /** true → відкликати токени ВСІХ пристроїв (загублений телефон), false → лише цього */
  everywhere?: boolean;
}

/** Скільки чекаємо на сервер під час виходу: далі виходимо локально, запит доходить сам */
const SERVER_WAIT_MS = 1500;

/**
 * Вихід без очікування: відкликаємо refresh-токен на сервері, але чекаємо не довше 1,5 с (повільна мережа
 * чи сервер не затримують людину), далі локальний вихід (`signOutLocally`) — на вхід веде guard навігації.
 */
export function useLogout(): UseMutationResult<void, ApiError, LogoutInput | void> {
  return useMutation<void, ApiError, LogoutInput | void>({
    mutationFn: async (input) => {
      const userId = useAuthStore.getState().user?.id;
      const revoke = (async () => {
        // спершу свіжий access-токен, і лише ПОТІМ читаємо refresh-токен для тіла запиту: інакше оновлення
        // під час самого logout зробило б токен у тілі «повторно використаним» → сервер відкликав би всі сесії
        await ensureFreshAccess();
        if (input?.everywhere) {
          await api.auth.logoutAll();
          return;
        }
        const refreshToken = await getRefreshToken();
        if (refreshToken) await api.auth.logout({ refreshToken });
      })().catch(() => undefined); // сервер недоступний: локально виходимо все одно
      await Promise.race([revoke, new Promise((resolve) => setTimeout(resolve, SERVER_WAIT_MS))]);
      // вийшов — акаунт зникає й з перемикача акаунтів
      await signOutLocally({ forgetUserId: userId });
    },
  });
}
