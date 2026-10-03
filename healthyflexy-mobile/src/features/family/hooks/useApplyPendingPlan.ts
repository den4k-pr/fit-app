import { useEffect, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { Family } from '@/types';
import { useUpdatePlan } from './useUpdatePlan';

/**
 * Дитина налаштувала перший план до появи сім'ї. Щойно сім'я є на сервері, план надсилається автоматично (один раз)
 * і зникає з пристрою. Помилка мережі → спробуємо ще раз при наступному відкритті дашборда.
 */
export function useApplyPendingPlan(family: Family | undefined): void {
  const pending = useOnboardingStore((s) => s.pendingPlan);
  const update = useUpdatePlan();
  const sent = useRef(false);
  const { mutate } = update;

  useEffect(() => {
    if (!family || !pending || sent.current) return;
    sent.current = true;
    mutate(pending, {
      onSuccess: () => useOnboardingStore.getState().clearPendingPlan(),
      onError: () => {
        sent.current = false;
      },
    });
  }, [family, pending, mutate]);
}
