import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { Family, UpdatePlanRequest } from '@/types';

/** PATCH /families/current/plan. Зміни діють з наступного дня (сьогоднішній день і минулі не змінюються). */
export function useUpdatePlan(): UseMutationResult<Family, ApiError, UpdatePlanRequest> {
  const queryClient = useQueryClient();
  return useMutation<Family, ApiError, UpdatePlanRequest>({
    mutationFn: (body) => api.families.updatePlan(body),
    onSuccess: (family) => {
      queryClient.setQueryData(queryKeys.family.current(), family);
      // склад днів оновиться у фоні — збереження не чекає на це
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      showToast(i18n.t('plan.saved'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
}
