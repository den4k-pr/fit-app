import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Program, SaveProgramRequest } from '@/types';

/** POST /programs: створити власну програму (@Roles(child)) */
export function useCreateProgram(): UseMutationResult<Program, ApiError, SaveProgramRequest> {
  const queryClient = useQueryClient();
  return useMutation<Program, ApiError, SaveProgramRequest>({
    mutationFn: (body) => api.programs.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.mine() });
    },
  });
}
