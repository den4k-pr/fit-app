import { subDays } from 'date-fns';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import { isApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import { DASHBOARD_RECENT_DAYS } from '@/constants/limits';
import { toIsoDate } from '@/lib/iso-date';
import type { DayDetail, DaySession } from '@/types';

/** Той самий день, але з гарантовано непорожньою сесією (після фільтра нижче) */
export type DayWithSession = DayDetail & { session: DaySession };

/**
 * Кадри за останні 7 днів (ТЗ §7.1): ОДИН запит GET /workouts/days?from&to (лише дні із записом).
 * Сервер без цього ендпоінта (застосунок оновився раніше) → як раніше, по запиту на день.
 */
export function useWeekPhotos(): UseQueryResult<DayWithSession[], ApiError> {
  const familyReady = useFamilyReady();
  const today = toIsoDate(new Date());
  return useQuery<DayWithSession[], ApiError>({
    queryKey: queryKeys.workouts.weekPhotos(today),
    enabled: familyReady,
    queryFn: async () => {
      const dates = Array.from({ length: DASHBOARD_RECENT_DAYS }, (_, i) => toIsoDate(subDays(new Date(), i)));
      try {
        const days = await api.workouts.getDaysDetail(dates[dates.length - 1], dates[0]);
        return days.filter((d): d is DayWithSession => d.session !== null);
      } catch (error) {
        if (!(isApiError(error) && error.status === 404 && /Cannot GET/i.test(error.message))) throw error;
      }
      const days = await Promise.all(dates.map((date) => api.workouts.getDayDetail(date)));
      return days.filter((d): d is DayWithSession => d.session !== null);
    },
  });
}
