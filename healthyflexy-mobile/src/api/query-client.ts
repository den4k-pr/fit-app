import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { isApiError } from './errors';

/**
 * Помилки 4xx (крім 408/429) повторювати немає сенсу; мережеві — один раз (було два × 20 с таймауту =
 * до хвилини «крутилки»). Дані вважаються свіжими хвилину: перехід між вкладками не перезапитує все знову,
 * а зміни після дій користувача приходять через оновлення кешу/інвалідацію.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      // «фокус» = застосунок повернувся з фону (див. focusManager нижче): застарілі дані дотягуються самі
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (
          isApiError(error) &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 429].includes(error.status)
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});

/**
 * Повернення застосунку з фону = «фокус» для TanStack Query. Раніше цього не було: відкриті вкладки
 * (змонтовані екрани) після ночі у фоні показували вчорашній «Сьогодні», доки людина не потягне вниз.
 */
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => subscription.remove();
  });
}
