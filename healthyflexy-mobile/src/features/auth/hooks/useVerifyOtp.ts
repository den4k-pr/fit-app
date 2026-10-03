import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { deviceInfo, establishSession, persistTokens } from '@/services/auth/session';
import { beginSession } from '@/services/auth/sign-out';
import type { VerifyOtpResponse } from '@/types';

export interface VerifyOtpInput {
  phone: string;
  code: string;
}

/**
 * POST /auth/otp/verify → токени (SecureStore + пам'ять), користувач у auth.store, згода з consent-екрана,
 * таймзона й стан сім'ї. Після цього `useAuthRedirect` сам веде на роль / профіль / «Сьогодні».
 */
export function useVerifyOtp(): UseMutationResult<VerifyOtpResponse, ApiError, VerifyOtpInput> {
  const queryClient = useQueryClient();
  return useMutation<VerifyOtpResponse, ApiError, VerifyOtpInput>({
    mutationFn: async ({ phone, code }) => api.auth.verifyOtp({ phone, code, ...(await deviceInfo()) }),
    onSuccess: async (response) => {
      beginSession();
      await persistTokens(response.tokens);
      queryClient.clear();
      await establishSession(response.user, { isNewUser: response.isNewUser });
    },
  });
}
