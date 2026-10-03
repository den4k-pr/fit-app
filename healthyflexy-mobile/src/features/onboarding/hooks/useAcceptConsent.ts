import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

/** POST /users/me/consent: усі три чекбокси обов'язкові (ТЗ §5.2). Після входу — коли згода була дана до реєстрації. */
export function useAcceptConsent(): UseMutationResult<User, ApiError, void> {
  return useMutation<User, ApiError, void>({
    mutationFn: () => api.users.acceptConsent({ termsAndPrivacyAccepted: true, disclaimerAccepted: true, doctorConsultationConfirmed: true }),
    onSuccess: (user) => useAuthStore.getState().setUser(user),
  });
}
