import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import type { ParentStatus } from '@/types';

/** GET /families/current/parent-status (дитина). TODO(realtime): оновлювати по події session.updated. */
export function useParentStatus(): UseQueryResult<ParentStatus, ApiError> {
  const familyReady = useFamilyReady();
  return useQuery<ParentStatus, ApiError>({
    queryKey: queryKeys.family.parentStatus(),
    enabled: familyReady,
    queryFn: () => api.families.getParentStatus(),
  });
}
