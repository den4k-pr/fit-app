import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/api/gateway';
import { isApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import type { Family } from '@/types';

/** Як часто перевіряємо, чи приєднався батько/мати, поки сім'ї ще немає */
const NO_FAMILY_POLL_MS = 8000;

/**
 * GET /families/current — лише коли сім'я справді є. Поки її немає (реєстрація, очікування батька/матері),
 * `current` НЕ запитується (раніше кожні 8 с летів запит і поверталося 404 FAMILY_NOT_FOUND): натомість раз на 8 с
 * перевіряється список сімей (`GET /families`, порожній список — звичайна відповідь 200). Щойно сім'я з'явилась —
 * `hasFamily = true`, і далі завантажується сама сім'я. «Сім'ї немає» → `data: null` (нормальний стан, не помилка).
 */
export function useFamily(): UseQueryResult<Family | null, ApiError> {
  const hasFamily = useAuthStore((s) => s.hasFamily);
  const queryClient = useQueryClient();

  const waiting = useQuery<Family[], ApiError>({
    queryKey: queryKeys.family.list(),
    queryFn: () => api.families.list(),
    enabled: hasFamily === false,
    refetchInterval: hasFamily === false ? NO_FAMILY_POLL_MS : false,
  });
  const appeared = hasFamily === false && (waiting.data?.length ?? 0) > 0;
  useEffect(() => {
    if (!appeared) return;
    useAuthStore.getState().setHasFamily(true);
    void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
  }, [appeared, queryClient]);

  const current = useQuery<Family | null, ApiError>({
    queryKey: queryKeys.family.current(),
    enabled: hasFamily !== false,
    queryFn: async () => {
      try {
        return await api.families.getCurrent();
      } catch (error) {
        // сім'ю щойно видалили (акаунт батька/матері) — повертаємося до стану «сім'ї немає»
        if (isApiError(error) && error.code === 'FAMILY_NOT_FOUND') {
          useAuthStore.getState().setHasFamily(false);
          return null;
        }
        throw error;
      }
    },
  });

  if (hasFamily === false) {
    return {
      ...current,
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isRefetching: waiting.isRefetching,
      refetch: waiting.refetch as unknown as typeof current.refetch,
    } as UseQueryResult<Family | null, ApiError>;
  }
  return current;
}
