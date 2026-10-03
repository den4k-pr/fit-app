import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Program, SaveProgramRequest } from '@/types';

export interface UpdateProgramInput {
  id: string;
  body: SaveProgramRequest;
}

/** PATCH /programs/:id: редагувати власну (не preset) програму (@Roles(child)) */
export function useUpdateProgram(): UseMutationResult<Program, ApiError, UpdateProgramInput> {
  const queryClient = useQueryClient();
  return useMutation<Program, ApiError, UpdateProgramInput>({
    mutationFn: ({ id, body }) => api.programs.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.mine() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.assignment() });
      // склад «Сьогодні» залежить від програми
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
    },
  });
}
