import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Today } from '@/types';

/** GET /workouts/today (батько/мати). Тексти вже локалізовані сервером мовою профілю користувача. */
export function useToday(): UseQueryResult<Today, ApiError> {
  return useQuery<Today, ApiError>({
    queryKey: queryKeys.workouts.today(),
    queryFn: () => api.workouts.getToday(),
  });
}
