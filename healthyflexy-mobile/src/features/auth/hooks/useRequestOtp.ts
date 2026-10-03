import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import type { RequestOtpRequest, RequestOtpResponse } from '@/types';

/** POST /auth/otp/request → { retryAfterSeconds: 60, expiresInSeconds: 300 } */
export function useRequestOtp(): UseMutationResult<RequestOtpResponse, ApiError, RequestOtpRequest> {
  return useMutation<RequestOtpResponse, ApiError, RequestOtpRequest>({
    mutationFn: (body) => api.auth.requestOtp(body),
  });
}
