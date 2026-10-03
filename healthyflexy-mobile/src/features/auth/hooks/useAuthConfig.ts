import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/gateway';

/**
 * Які способи входу доступні: пошта (код у листі), телефон (код у SMS), Google. Вхід завжди з кодом —
 * тестових акаунтів і входу без коду немає. Поки сервер не відповів, показуємо пошту й телефон (як раніше).
 */
export function useAuthConfig(): { emailEnabled: boolean; phoneEnabled: boolean; googleEnabled: boolean; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['auth', 'config'],
    queryFn: () => api.auth.getConfig(),
    staleTime: 5 * 60_000,
  });
  return {
    emailEnabled: query.data?.emailEnabled ?? true,
    phoneEnabled: query.data?.phoneEnabled ?? true,
    // сервер ще не відповів — кнопку Google не ховаємо (за наявності Client ID на пристрої)
    googleEnabled: query.data?.googleEnabled ?? true,
    isLoading: query.isLoading,
  };
}
