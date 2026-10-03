import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { LedgerEntry } from '@/types';

export interface ResolveSettlementInput {
  id: string;
  accept: boolean;
}

/** POST /ledger/settlements/:id/resolve: лише батько/мати. accept → confirmed, інакше rejected. */
export function useResolveSettlement(): UseMutationResult<LedgerEntry, ApiError, ResolveSettlementInput> {
  const queryClient = useQueryClient();
  return useMutation<LedgerEntry, ApiError, ResolveSettlementInput>({
    mutationFn: ({ id, accept }) => api.ledger.resolveSettlement(id, { accept }),
    onSuccess: (_entry, { accept }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.today() });
      showToast(i18n.t(accept ? 'settlement.confirmed' : 'settlement.rejected'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
}
