import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Program } from '@/types';

/** GET /programs/mine: власні (не preset) програми дитини */
export function useMyPrograms(): UseQueryResult<Program[], ApiError> {
  return useQuery<Program[], ApiError>({
    queryKey: queryKeys.programs.mine(),
    queryFn: () => api.programs.mine(),
  });
}
