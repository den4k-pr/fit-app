import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Exercise } from '@/types';

/** GET /exercises: повний каталог безпечних вправ (для пікера у редакторі програми) */
export function useExerciseCatalog(): UseQueryResult<Exercise[], ApiError> {
  return useQuery<Exercise[], ApiError>({
    queryKey: queryKeys.exercises.all,
    queryFn: () => api.exercises.list(),
  });
}
