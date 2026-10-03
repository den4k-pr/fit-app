import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useFamilyReady } from '@/store/auth.store';
import type { LedgerListQuery, LedgerListResponse } from '@/types';

/** GET /ledger: нескінченний список із курсорною пагінацією (нові записи першими) */
export function useLedger(
  query: Omit<LedgerListQuery, 'cursor'> = {},
): UseInfiniteQueryResult<InfiniteData<LedgerListResponse>, ApiError> {
  const familyReady = useFamilyReady();
  return useInfiniteQuery<LedgerListResponse, ApiError, InfiniteData<LedgerListResponse>, ReturnType<typeof queryKeys.ledger.list>, string | undefined>({
    queryKey: queryKeys.ledger.list(query),
    enabled: familyReady,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => api.ledger.list({ ...query, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
