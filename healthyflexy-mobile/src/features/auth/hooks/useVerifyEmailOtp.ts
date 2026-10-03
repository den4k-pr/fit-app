import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { deviceInfo, establishSession, persistTokens } from '@/services/auth/session';
import { beginSession } from '@/services/auth/sign-out';
import type { VerifyOtpResponse } from '@/types';

export interface VerifyEmailOtpInput {
  email: string;
  code: string;
}

/** POST /auth/email/verify: далі все так само, як після коду з SMS (токени, користувач, згода, стан сім'ї) */
export function useVerifyEmailOtp(): UseMutationResult<VerifyOtpResponse, ApiError, VerifyEmailOtpInput> {
  const queryClient = useQueryClient();
  return useMutation<VerifyOtpResponse, ApiError, VerifyEmailOtpInput>({
    mutationFn: async ({ email, code }) => api.auth.verifyEmailOtp({ email, code, ...(await deviceInfo()) }),
    onSuccess: async (response) => {
      beginSession();
      await persistTokens(response.tokens);
      queryClient.clear();
      await establishSession(response.user, { isNewUser: response.isNewUser });
    },
  });
}
