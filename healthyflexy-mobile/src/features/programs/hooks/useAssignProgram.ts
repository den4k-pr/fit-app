import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Program, ProgramAssignment } from '@/types';

interface AssignContext {
  previous: ProgramAssignment | null | undefined;
}

/**
 * POST /programs/:id/assign: призначити (preset або власну) програму своїй сім'ї (@Roles(child)).
 * Оптимістично: картка «Активна програма» змінюється одразу, при помилці — повертається попередня.
 * Склад «Сьогодні»/календаря перезавантажується у фоні — кнопка не чекає на це.
 */
export function useAssignProgram(): UseMutationResult<ProgramAssignment, ApiError, Program, AssignContext> {
  const queryClient = useQueryClient();
  const key = queryKeys.programs.assignment();
  return useMutation<ProgramAssignment, ApiError, Program, AssignContext>({
    mutationFn: (program) => api.programs.assign(program.id),
    onMutate: async (program) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProgramAssignment | null>(key);
      const optimistic: ProgramAssignment = {
        id: previous?.id ?? 'pending',
        programId: program.id,
        programName: program.name,
        startDate: new Date().toISOString().slice(0, 10),
        isActive: true,
      };
      queryClient.setQueryData(key, optimistic);
      return { previous };
    },
    onError: (_error, _program, context) => {
      queryClient.setQueryData(key, context?.previous ?? null);
    },
    onSuccess: (assignment) => {
      queryClient.setQueryData(key, assignment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
    },
  });
}
