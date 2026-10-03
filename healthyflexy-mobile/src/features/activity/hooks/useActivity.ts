import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import type { Activity, ActivityPeriod } from '@/types';

/** Графік «Кроки і тренування»: при зміні періоду попередній графік лишається, поки вантажиться новий */
export function useActivity(period: ActivityPeriod): UseQueryResult<Activity, ApiError> {
  const familyReady = useFamilyReady();
  return useQuery<Activity, ApiError>({
    queryKey: queryKeys.activity(period),
    enabled: familyReady,
    queryFn: () => api.activity.get(period),
    placeholderData: keepPreviousData,
  });
}
