import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { CompleteExerciseResponse } from '@/types';
import { applyToToday } from './useCompleteExercise';

/**
 * Пропустити вправу без оплати (не вдалася / AI не зарахував): вправа вважається пройденою, інші вправи дня
 * доступні в будь-якому порядку; день завершиться, коли пройдено всі.
 */
export function useSkipExercise(): UseMutationResult<CompleteExerciseResponse, ApiError, { sessionId: string; exerciseId: string }> {
  const queryClient = useQueryClient();
  return useMutation<CompleteExerciseResponse, ApiError, { sessionId: string; exerciseId: string }>({
    mutationFn: ({ sessionId, exerciseId }) => api.workouts.skipExercise(sessionId, exerciseId),
    onSuccess: (result, input) => {
      if (!result.accepted) return;
      applyToToday(queryClient, result, input.exerciseId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      if (result.dayCompleted) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      }
      showToast(i18n.t(result.dayCompleted ? 'exercise.skip.doneDay' : 'exercise.skip.done'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
}
