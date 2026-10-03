import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import type { Calendar, YearMonth } from '@/types';

/** GET /workouts/calendar?month=YYYY-MM (обидві ролі) */
export function useCalendarMonth(month: YearMonth): UseQueryResult<Calendar, ApiError> {
  const familyReady = useFamilyReady();
  return useQuery<Calendar, ApiError>({
    queryKey: queryKeys.workouts.calendar(month),
    enabled: familyReady,
    queryFn: () => api.workouts.getCalendar({ month }),
  });
}
