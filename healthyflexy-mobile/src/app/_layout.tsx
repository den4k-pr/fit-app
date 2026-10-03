import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { appAreaOf } from '@/features/auth/lib/app-area';
import { installApiInterceptors } from '@/api/interceptors';
import { useRemoteAppConfig } from '@/hooks/useRemoteAppConfig';
import { AppHeader } from '@/navigation/AppHeader';
import { AppProviders } from '@/providers/AppProviders';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';
import { OfflineStart } from '@/features/auth/components/OfflineStart';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { colors, useAppFonts } from '@/theme';

/** Останній рубіж: помилка рендеру будь-де в дереві навігації не валить застосунок у білий екран. */
export const ErrorBoundary = RouteErrorBoundary;

void SplashScreen.preventAutoHideAsync();

// Bearer, єдиний refresh при 401, нормалізація помилок у ApiError
installApiInterceptors();

/**
 * Корінь застосунку: шрифти → bootstrap (хто я) → guard за роллю.
 * Guard'и (`Stack.Protected`) не пускають на «чужі» маршрути: батько/мати не бачить екрани дитини і навпаки.
 * TODO: useRealtimeSync(), useNotificationRouting().
 */
export default function RootLayout() {
  const { loaded } = useAppFonts();
  // палітра й тексти з CRM
  useRemoteAppConfig();
  return (
    <AppProviders>
      <StatusBar style="light" />
      {loaded ? <RootNavigator /> : null}
    </AppProviders>
  );
}

function RootNavigator() {
  const { isReady, offline, checking, retry } = useAuthBootstrap();
  const user = useAuthStore((s) => s.user);
  const hasFamily = useAuthStore((s) => s.hasFamily);
  const onboardingReady = useOnboardingStore((s) => s.hydrated);
  const firstPlanDone = useOnboardingStore((s) => s.firstPlanDone);

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady || !onboardingReady) return null;
  // немає зв'язку на старті: сесія лишається, пропонуємо повторити (а не викидаємо на екран входу)
  if (offline) return <OfflineStart checking={checking} onRetry={retry} />;

  const area = appAreaOf(user, hasFamily, firstPlanDone);
  const isParent = area === 'parent';
  const isChild = area === 'child';
  const withAppHeader = { headerShown: true, header: () => <AppHeader /> } as const;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        // однаковий плавний перехід на iOS і Android
        animation: 'slide_from_right',
        animationDuration: 320,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isParent && !isChild}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isParent}>
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="exercise/[exerciseId]" options={withAppHeader} />
        <Stack.Screen name="reward" options={{ ...withAppHeader, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={isChild}>
        <Stack.Screen name="(child)" />
        <Stack.Screen name="photos/[recordId]" options={withAppHeader} />
        <Stack.Screen name="program-editor/[id]" options={withAppHeader} />
        <Stack.Screen name="catalog-exercise/[exerciseId]" options={withAppHeader} />
        <Stack.Screen name="settlement/new" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Screen name="join/[code]" />
    </Stack>
  );
}
