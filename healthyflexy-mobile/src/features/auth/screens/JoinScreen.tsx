import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ROUTES } from '@/constants/routes';
import { LoadingView } from '@/shared/ui/LoadingView';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * Deep link `healthyflexy://join/ABC234` (ТЗ §5.5): запам'ятовуємо код і передаємо керування auth-redirect.
 * До входу код чекає (onboarding.store); після ролі «батько/мати» він підставляється на екрані «Чекаємо на запрошення».
 */
export function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => {
    if (code) useOnboardingStore.getState().setPendingInviteCode(code.toUpperCase());
  }, [code]);
  if (!code) return <LoadingView />;
  return <Redirect href={ROUTES.root} />;
}
