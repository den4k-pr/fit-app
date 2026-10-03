import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { ISODate, PlannedDay } from '@/types';

/** Склад обраного дня з «Програми тренувань» (null — день не обрано) */
export function usePlannedDay(date: ISODate | null): UseQueryResult<PlannedDay, ApiError> {
  return useQuery<PlannedDay, ApiError>({
    queryKey: queryKeys.workouts.plan(date ?? ''),
    queryFn: () => api.workouts.getPlannedDay(date as ISODate),
    enabled: date !== null,
  });
}
