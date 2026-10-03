import { Stack } from 'expo-router';
import { AppHeader } from '@/navigation/AppHeader';
import { colors } from '@/theme';

/** Екрани входу: спільна верхня смуга й плавне розтікання між кроками; онбординг без смуги (на весь екран) */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, header: () => <AppHeader />, animation: 'fade', animationDuration: 220, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}
