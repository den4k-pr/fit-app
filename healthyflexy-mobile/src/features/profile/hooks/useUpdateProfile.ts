import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import type { UpdateProfileRequest, User } from '@/types';

/** PATCH /users/me → оновити користувача в auth.store і в кеші */
export function useUpdateProfile(): UseMutationResult<User, ApiError, UpdateProfileRequest> {
  const queryClient = useQueryClient();
  return useMutation<User, ApiError, UpdateProfileRequest>({
    mutationFn: (body) => api.users.updateProfile(body),
    onSuccess: (user) => {
      useAuthStore.getState().setUser(user);
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}
