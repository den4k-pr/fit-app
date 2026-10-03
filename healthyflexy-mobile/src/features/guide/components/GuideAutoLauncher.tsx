import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { GuideRole } from '../guide.slides';
import { useGuideStore } from '../guide.store';
import { GuideModal } from './GuideModal';

/**
 * Гайд для ролі: першого разу (на цьому пристрої) відкривається сам — але лише коли акаунт повністю готовий:
 * реєстрацію завершено й сім'ю з'єднано (батько/мати приєднався за кодом). Під час реєстрації й очікування
 * запрошення гайд не показується. Далі — лише з «Профілю». Рендерить і саме вікно гайду.
 */
export function GuideAutoLauncher({ role }: { role: GuideRole }) {
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const seen = useOnboardingStore((s) => !!s.guideSeen[role]);
  const ready = useAuthStore((s) => s.hasFamily === true);
  useEffect(() => {
    if (!hydrated || seen || !ready) return undefined;
    // трохи згодом: спершу людина бачить свій екран, потім — гайд поверх нього
    const timer = setTimeout(() => useGuideStore.getState().open(role), 900);
    return () => clearTimeout(timer);
  }, [hydrated, seen, ready, role]);
  return <GuideModal />;
}
