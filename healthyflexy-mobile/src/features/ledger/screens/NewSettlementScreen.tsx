import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { subMoney } from '@/lib/money-math';
import { Button } from '@/shared/ui/Button';
import { CelebrationIllustration } from '@/shared/illustrations';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { useFamilyStats } from '@/features/family/hooks/useFamilyStats';
import { SettlementForm } from '../components/SettlementForm';

/** Модальне вікно «Переказ зроблено» (ТЗ §7.1, §8.5): сума ≤ належить − очікує підтвердження */
export function NewSettlementScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useFamilyStats();
  const close = () => router.back();

  let body;
  if (stats.isLoading) body = <LoadingView />;
  else if (!stats.data) body = <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
  else {
    const available = subMoney(stats.data.owed, stats.data.pendingTotal);
    body =
      available > 0 ? (
        <SettlementForm available={available} currency={stats.data.currency} onDone={close} />
      ) : (
        <EmptyState illustration={<CelebrationIllustration size={150} />} title={t('settlement.nothingOwed')} action={<Button variant="secondary" icon="arrow-left" label={t('common.back')} onPress={close} />} />
      );
  }

  return (
    <Screen bottomInset>
      <ScreenHeader title={t('settlement.title')} onBack={close} backLabel={t('common.close')} />
      {body}
    </Screen>
  );
}
