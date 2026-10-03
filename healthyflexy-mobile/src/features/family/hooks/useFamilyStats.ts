import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import type { FamilyStats } from '@/types';

/** GET /families/current/stats: баланс, серія, % виконання. Усе рахує сервер. */
export function useFamilyStats(): UseQueryResult<FamilyStats, ApiError> {
  const familyReady = useFamilyReady();
  return useQuery<FamilyStats, ApiError>({
    queryKey: queryKeys.family.stats(),
    enabled: familyReady,
    queryFn: () => api.families.getStats(),
  });
}
