import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { showToast } from '@/store/ui.store';
import type { CreateFundDepositRequest, FundDeposit } from '@/types';

/** POST /ledger/fund-deposits: спонсор поповнює «Фонд» (лише облік) → оновлюються плитки грошей */
export function useFundDeposit(): UseMutationResult<FundDeposit, ApiError, CreateFundDepositRequest> {
  const queryClient = useQueryClient();
  return useMutation<FundDeposit, ApiError, CreateFundDepositRequest>({
    mutationFn: (body) => api.ledger.createFundDeposit(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
      showToast(i18n.t('money.fund.deposited'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
}
