import type { ErrorBoundaryProps } from 'expo-router';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { Screen } from './Screen';

/**
 * Локальний Error Boundary для критичного екрана (Expo Router `export const ErrorBoundary`):
 * помилка рендеру валить лише цей маршрут, а не весь застосунок. «Спробувати ще раз» перемонтовує
 * екран; «На головну» — вихід на `/`, коли причина в самих параметрах маршруту (retry не допоможе).
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen scroll={false} bottomInset>
      <ErrorState error={error} onRetry={() => void retry()} />
      <Button variant="ghost" size="sm" label={t('common.backHome')} onPress={() => router.replace(ROUTES.root)} />
    </Screen>
  );
}
