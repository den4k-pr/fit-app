import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import type { CreateUploadUrlRequest, UploadUrlResponse } from '@/types';

/** POST /workouts/uploads: підписаний URL для завантаження відео напряму у сховище */
export function useCreateUploadUrl(): UseMutationResult<UploadUrlResponse, ApiError, CreateUploadUrlRequest> {
  return useMutation<UploadUrlResponse, ApiError, CreateUploadUrlRequest>({
    mutationFn: (body) => api.workouts.createUploadUrl(body),
  });
}
