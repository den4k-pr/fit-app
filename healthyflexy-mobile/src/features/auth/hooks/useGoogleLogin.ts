import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { deviceInfo, establishSession, persistTokens } from '@/services/auth/session';
import { beginSession } from '@/services/auth/sign-out';
import type { VerifyOtpResponse } from '@/types';

/** POST /auth/google: ID-токен від Google → далі як після коду з пошти (токени, користувач, згода, сім'я) */
export function useGoogleLogin(): UseMutationResult<VerifyOtpResponse, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation<VerifyOtpResponse, ApiError, string>({
    mutationFn: async (idToken) => api.auth.google({ idToken, ...(await deviceInfo()) }),
    onSuccess: async (response) => {
      beginSession();
      await persistTokens(response.tokens);
      queryClient.clear();
      await establishSession(response.user, { isNewUser: response.isNewUser });
    },
  });
}
