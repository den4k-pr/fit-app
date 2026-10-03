import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { DayDetail, ISODate } from '@/types';

/** GET /workouts/days/:date: вправи дня з кадрами (для дитини). Тексти вже локалізовані сервером. */
export function useDayDetail(date: ISODate | null): UseQueryResult<DayDetail, ApiError> {
  return useQuery<DayDetail, ApiError>({
    queryKey: queryKeys.workouts.day(date ?? 'none'),
    queryFn: () => api.workouts.getDayDetail(date as ISODate),
    enabled: date !== null,
  });
}
