import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { ProgramAssignment } from '@/types';

/** GET /programs/assignment/current: активна програма сім'ї (обидві ролі); null — ще не обрана */
export function useCurrentAssignment(): UseQueryResult<ProgramAssignment | null, ApiError> {
  return useQuery<ProgramAssignment | null, ApiError>({
    queryKey: queryKeys.programs.assignment(),
    queryFn: () => api.programs.currentAssignment(),
  });
}
