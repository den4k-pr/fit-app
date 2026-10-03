import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { UserRole, type User } from '@/types';

export type AppArea = 'parent' | 'child' | null;

/**
 * Яка частина застосунку відкрита (guard'и `Stack.Protected` у корені): parent / child або null — екрани входу.
 * «Профіль готовий» = є роль і ім'я. Батько/мати без сім'ї лишається в екранах входу (ввід коду запрошення),
 * дитина без сім'ї — поки не пройде «перший план».
 */
export function appAreaOf(user: User | null, hasFamily: boolean | null, firstPlanDone: boolean): AppArea {
  const role = user?.role ?? null;
  const profileReady = role !== null && !!user?.name;
  if (!profileReady) return null;
  if (role === UserRole.Parent) return hasFamily === false ? null : 'parent';
  return hasFamily === false && !firstPlanDone ? null : 'child';
}

/**
 * Після кроку входу/налаштування: якщо guard'и відкрили застосунок, `Stack.Protected` САМ переходить на його
 * стартовий екран — власний `router.replace` поверх цього давав подвійну навігацію (збої, «блимання»).
 * Ведемо на `/` лише тоді, коли користувач лишається в екранах входу (наступний крок: роль, профіль…).
 */
export function staysInAuth(): boolean {
  const { user, hasFamily } = useAuthStore.getState();
  return appAreaOf(user, hasFamily, useOnboardingStore.getState().firstPlanDone) === null;
}
