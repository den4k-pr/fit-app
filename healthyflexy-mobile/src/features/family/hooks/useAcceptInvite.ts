import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { AcceptInviteRequest, Family } from '@/types';

/**
 * POST /families/join → сім'я з відповіді одразу в кеші, забути збережений код із deep link.
 * Без очікування перезавантаження ВСЬОГО кешу (раніше кнопка «крутилась» ще один-два обміни з сервером).
 */
export function useAcceptInvite(): UseMutationResult<Family, ApiError, AcceptInviteRequest> {
  const queryClient = useQueryClient();
  return useMutation<Family, ApiError, AcceptInviteRequest>({
    mutationFn: (body) => api.families.join(body),
    onSuccess: (family) => {
      useOnboardingStore.getState().setPendingInviteCode(null);
      void queryClient.invalidateQueries();
      queryClient.setQueryData(queryKeys.family.current(), family);
      // guard'и відкривають застосунок — перехід робить навігація
      useAuthStore.getState().setHasFamily(true);
    },
  });
}
