import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Invite } from '@/types';

/** GET /families/invites/active: чинне запрошення дитини (або null) */
export function useActiveInvite(): UseQueryResult<Invite | null, ApiError> {
  return useQuery<Invite | null, ApiError>({
    queryKey: queryKeys.family.activeInvite(),
    queryFn: () => api.families.getActiveInvite(),
  });
}
