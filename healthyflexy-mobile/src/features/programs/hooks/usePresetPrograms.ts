import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Program } from '@/types';

/** GET /programs/presets: готові гериатричні пресети (обидві ролі) */
export function usePresetPrograms(): UseQueryResult<Program[], ApiError> {
  return useQuery<Program[], ApiError>({
    queryKey: queryKeys.programs.presets(),
    queryFn: () => api.programs.presets(),
  });
}
