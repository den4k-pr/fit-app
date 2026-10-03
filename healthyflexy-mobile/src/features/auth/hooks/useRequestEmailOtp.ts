import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import type { RequestEmailOtpRequest, RequestOtpResponse } from '@/types';

/** POST /auth/email/request → лист із кодом; { retryAfterSeconds: 60, expiresInSeconds: 300 } */
export function useRequestEmailOtp(): UseMutationResult<RequestOtpResponse, ApiError, RequestEmailOtpRequest> {
  return useMutation<RequestOtpResponse, ApiError, RequestEmailOtpRequest>({
    mutationFn: (body) => api.auth.requestEmailOtp(body),
  });
}
