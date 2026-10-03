import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { signOutLocally } from '@/services/auth/sign-out';
import { useAuthStore } from '@/store/auth.store';

/**
 * DELETE /users/me (GDPR ст. 17; вимога Apple). Після успіху — локальний вихід зі скиданням онбордингу;
 * на вхід веде guard навігації (без власного `router.replace`, який конфліктував із ним).
 */
export function useDeleteAccount(): UseMutationResult<void, ApiError, void> {
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const userId = useAuthStore.getState().user?.id;
      await api.users.deleteAccount();
      await signOutLocally({ forgetUserId: userId, resetOnboarding: true });
    },
  });
}
