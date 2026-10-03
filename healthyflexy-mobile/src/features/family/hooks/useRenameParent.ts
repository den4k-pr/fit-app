import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { Family } from '@/types';

/** PATCH /families/current: дитина перейменовує батька/матір у перемикачі */
export function useRenameParent(): UseMutationResult<Family, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation<Family, ApiError, string>({
    mutationFn: (parentLabel) => api.families.rename({ parentLabel }),
    onSuccess: (family) => {
      queryClient.setQueryData(queryKeys.family.current(), family);
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.parentStatus() });
    },
  });
}
