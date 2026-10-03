import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { useSettingsStore } from '@/store/settings.store';
import type { Family } from '@/types';
import { useActiveInvite } from './useActiveInvite';

/** Кеш, що НЕ залежить від обраної сім'ї: при перемиканні батьків його не скидаємо */
const FAMILY_INDEPENDENT = new Set<unknown>(['me', 'families-list', 'exercises']);

/**
 * Усі сім'ї користувача (у дитини — перемикач «👵 Мама · 👴 Тато · +»). Поки є активне запрошення,
 * перевіряємо кожні 10 с: щойно новий батько/мати приєднається, він з'явиться в перемикачі.
 * Якщо обрана сім'я зникла (видалено акаунт) — повертаємося до першої.
 */
export function useFamilies(): UseQueryResult<Family[], ApiError> {
  const invite = useActiveInvite();
  const activeFamilyId = useSettingsStore((s) => s.activeFamilyId);
  const query = useQuery<Family[], ApiError>({
    queryKey: queryKeys.family.list(),
    queryFn: () => api.families.list(),
    refetchInterval: invite.data ? 10_000 : false,
  });
  const families = query.data;
  useEffect(() => {
    if (!families || families.length === 0) return;
    if (!activeFamilyId || !families.some((f) => f.id === activeFamilyId)) {
      useSettingsStore.getState().setActiveFamilyId(families[0].id);
    }
  }, [families, activeFamilyId]);
  return query;
}

/** Обрати батька/матір у перемикачі: заголовок X-Family-Id змінюється, дані попередньої сім'ї перезавантажуються */
export function useSelectFamily(): (familyId: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (familyId: string) => {
      if (useSettingsStore.getState().activeFamilyId === familyId) return;
      useSettingsStore.getState().setActiveFamilyId(familyId);
      void queryClient.resetQueries({ predicate: (q) => !FAMILY_INDEPENDENT.has(q.queryKey[0]) });
    },
    [queryClient],
  );
}

/** Як показувати батька/матір: підпис дитини («Мама») або ім'я з профілю */
export const parentLabelOf = (family: Pick<Family, 'parentLabel' | 'counterpart'>): string =>
  family.parentLabel ?? family.counterpart.name ?? '';
