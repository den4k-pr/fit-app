import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { CreateSettlementRequest, LedgerEntry } from '@/types';

/** POST /ledger/settlements («Переказ зроблено»): створює запис у статусі pending */
export function useCreateSettlement(): UseMutationResult<LedgerEntry, ApiError, CreateSettlementRequest> {
  const queryClient = useQueryClient();
  return useMutation<LedgerEntry, ApiError, CreateSettlementRequest>({
    mutationFn: (body) => api.ledger.createSettlement(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
      showToast(i18n.t('settlement.created'));
    },
  });
}
