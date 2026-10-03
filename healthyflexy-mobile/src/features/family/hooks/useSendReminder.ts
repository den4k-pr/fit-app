import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { ReminderResponse } from '@/types';

/** POST /families/current/reminders: не частіше ніж раз на 2 години (REMINDER_TOO_SOON) */
export function useSendReminder(): UseMutationResult<ReminderResponse, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation<ReminderResponse, ApiError, void>({
    mutationFn: () => api.families.sendReminder(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.parentStatus() });
      showToast(i18n.t('dashboard.reminderSent'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
}
