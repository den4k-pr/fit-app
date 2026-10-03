import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import { isApiError, type ApiError } from '@/api/errors';
import { checkFamily } from '@/services/auth/session';
import { useAuthStore } from '@/store/auth.store';
import type { User, UserRole } from '@/types';

/**
 * PUT /users/me/role: роль обирається ОДИН раз (ROLE_ALREADY_SET). Одразу оновлюємо користувача й стан сім'ї.
 * Цей екран недосяжний без локально підтвердженої згоди (consent-екран), тому 403 CONSENT_REQUIRED тут —
 * завжди ознака, що синхронізація POST /users/me/consent на попередньому кроці не встигла піти на сервер
 * (рідкісна гонка гідратації локального стору при швидкому перезапуску). Самовиправляємось: підтверджуємо
 * згоду (ідемпотентно) і повторюємо запит — без цього користувач лишався б заблокованим назавжди.
 */
export function useSetRole(): UseMutationResult<User, ApiError, UserRole> {
  return useMutation<User, ApiError, UserRole>({
    mutationFn: async (role) => {
      try {
        return await api.users.setRole({ role });
      } catch (error) {
        if (!isApiError(error) || error.code !== 'CONSENT_REQUIRED') throw error;
        await api.users.acceptConsent({
          termsAndPrivacyAccepted: true,
          disclaimerAccepted: true,
          doctorConsultationConfirmed: true,
        });
        return api.users.setRole({ role });
      }
    },
    onSuccess: async (user) => {
      const store = useAuthStore.getState();
      store.setHasFamily(await checkFamily().catch(() => false));
      store.setUser(user);
    },
  });
}
