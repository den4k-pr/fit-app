import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import { ExerciseMode, type Family } from '@/types';
import { useFamily } from '@/features/family/hooks/useFamily';

type Selection = Pick<Family, 'exerciseMode' | 'selectedExerciseIds'>;

/**
 * Вибір вправ спонсора («Вправи»): галочки «включити в щоденні» й перемикач «Підбір ШІ».
 * Кожна зміна зберігається одразу (PATCH /families/current/plan) з оптимістичним оновленням кешу — список і
 * екран опису вправи бачать ту саму відмітку без кнопки «Зберегти». Діє з наступного дня (як і план).
 */
export function useExerciseSelection() {
  const family = useFamily();
  const queryClient = useQueryClient();
  const mutation = useMutation<Family, ApiError, Selection, { previous?: Family | null }>({
    mutationFn: (body) => api.families.updatePlan(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.family.current() });
      const previous = queryClient.getQueryData<Family | null>(queryKeys.family.current());
      if (previous) queryClient.setQueryData<Family>(queryKeys.family.current(), { ...previous, ...body });
      return { previous };
    },
    onError: (error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.family.current(), context.previous);
      showToast(i18n.t(`errors.${error.code}`));
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.family.current(), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
    },
  });

  const current: Selection = {
    exerciseMode: family.data?.exerciseMode ?? ExerciseMode.Ai,
    selectedExerciseIds: family.data?.selectedExerciseIds ?? [],
  };
  const aiEnabled = current.exerciseMode === ExerciseMode.Ai;

  return {
    family,
    aiEnabled,
    selectedIds: current.selectedExerciseIds,
    isSelected: (id: string) => current.selectedExerciseIds.includes(id),
    /** Відмітити / зняти вправу (у режимі ШІ відмітки зберігаються на випадок, якщо ШІ вимкнуть) */
    toggle: (id: string) => {
      const has = current.selectedExerciseIds.includes(id);
      const selectedExerciseIds = has ? current.selectedExerciseIds.filter((x) => x !== id) : [...current.selectedExerciseIds, id];
      mutation.mutate({ exerciseMode: current.exerciseMode, selectedExerciseIds });
    },
    setAiEnabled: (on: boolean) => {
      mutation.mutate({ exerciseMode: on ? ExerciseMode.Ai : ExerciseMode.Manual, selectedExerciseIds: current.selectedExerciseIds });
      showToast(i18n.t(on ? 'catalog.ai.enabledToast' : 'catalog.ai.disabledToast'));
    },
    saving: mutation.isPending,
  };
}
