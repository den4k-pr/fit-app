import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/api/query-client';
import '@/i18n';
import { ToastHost } from '@/shared/ui/Toast';

/**
 * Кореневі провайдери. Порядок: жести → safe-area → TanStack Query; ToastHost — поверх усього.
 * Error Boundary — в `app/_layout.tsx` (`export const ErrorBoundary`), там, де є router-контекст.
 * TODO: RealtimeProvider (socket після входу).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ToastHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
