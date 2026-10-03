import type { Href } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { UserRole } from '@/types';

/**
 * Куди вести за станом (ТЗ §5.1):
 *  signedOut → мова → згода → онбординг → телефон (ТЗ §5.1);
 *  без ролі → вибір ролі; без імені → профіль; батько/мати без сім'ї → «Чекаємо на запрошення»;
 *  інакше → parent: «Сьогодні», child: «Дашборд».
 */
export function useAuthRedirect(): Href | null {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hasFamily = useAuthStore((s) => s.hasFamily);
  const languageChosen = useOnboardingStore((s) => s.languageChosen);
  const onboardingSeen = useOnboardingStore((s) => s.onboardingSeen);
  const consentAcceptedAt = useOnboardingStore((s) => s.consentAcceptedAt);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const firstPlanDone = useOnboardingStore((s) => s.firstPlanDone);

  if (status === 'loading' || !hydrated) return null;
  if (status === 'signedOut' || !user) {
    if (!languageChosen) return ROUTES.language;
    if (!consentAcceptedAt) return ROUTES.consent;
    return onboardingSeen ? ROUTES.phone : ROUTES.onboarding;
  }
  if (!user.role) return ROUTES.role;
  if (!user.name) return ROUTES.profileSetup;
  if (user.role === UserRole.Parent) return hasFamily === false ? ROUTES.waitingInvite : ROUTES.parentToday;
  // дитина без сім'ї спершу налаштовує перший план (ТЗ §5.4, крок 5б)
  return hasFamily === false && !firstPlanDone ? ROUTES.firstPlan : ROUTES.childDashboard;
}
