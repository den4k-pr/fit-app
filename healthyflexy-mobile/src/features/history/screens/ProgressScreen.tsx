import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ActivityChart } from '@/features/activity/components/ActivityChart';
import { ActivityInsights } from '@/features/activity/components/ActivityInsights';
import { useActivity } from '@/features/activity/hooks/useActivity';
import { NoFamilyState } from '@/features/family/components/NoFamilyState';
import { ParentSwitcher } from '@/features/family/components/ParentSwitcher';
import { useFamily } from '@/features/family/hooks/useFamily';
import { useFamilyStats } from '@/features/family/hooks/useFamilyStats';
import { activityStats } from '@/features/dashboard/screens/ChildDashboardScreen';
import { LedgerList } from '@/features/ledger/components/LedgerList';
import { MoneyOverview } from '@/features/ledger/components/MoneyOverview';
import { SettlementConfirmCard } from '@/features/ledger/components/SettlementConfirmCard';
import { useLedger } from '@/features/ledger/hooks/useLedger';
import { ReminderCard } from '@/features/notifications/components/ReminderCard';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { StatGrid } from '@/shared/ui/StatCard';
import { LedgerStatus, LedgerType, UserRole, type ActivityPeriod } from '@/types';
import { MonthCalendar } from '../components/MonthCalendar';
import { useCalendarMonth } from '../hooks/useCalendarMonth';
import { useMonthNavigation } from '../hooks/useMonthNavigation';

/**
 * Таб «Прогрес» для обох ролей (макет `p-stats`): показники, графік «Кроки і тренування» з аналізом активності,
 * календар місяця, журнал розрахунків (тап по нарахуванню — деталі вправи).
 * Батько/мати додатково: картки підтвердження переказів і «Нагадування». Дитина бачить журнал лише для перегляду.
 */
export function ProgressScreen({ role }: { role: UserRole }) {
  const { t } = useTranslation();
  const isParent = role === UserRole.Parent;

  const stats = useFamilyStats();
  const family = useFamily();
  const nav = useMonthNavigation();
  const calendar = useCalendarMonth(nav.month);
  const ledger = useLedger();
  const [period, setPeriod] = useState<ActivityPeriod>('7');
  const activity = useActivity(period);

  if (family.data === null) return <NoFamilyState />;
  if (stats.isLoading || family.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (stats.isError || !stats.data || family.isError || !family.data) {
    return <Screen scroll={false}><ErrorState error={stats.error ?? family.error} onRetry={() => { void stats.refetch(); void family.refetch(); }} /></Screen>;
  }

  const entries = ledger.data?.pages.flatMap((page) => page.items) ?? [];
  const pending = entries.filter((e) => e.type === LedgerType.Settlement && e.status === LedgerStatus.Pending);
  // Батько/мати підтверджує очікувані перекази окремими картками, тому в журналі їх не дублюємо
  const journal = isParent ? entries.filter((e) => !pending.includes(e)) : entries;

  const refresh = () => {
    void stats.refetch();
    void calendar.refetch();
    void ledger.refetch();
    void activity.refetch();
  };

  return (
    <Screen refreshing={stats.isRefetching} onRefresh={refresh}>
      {isParent ? null : <ParentSwitcher current={family.data} />}
      <SectionLabel>{t('money.section')}</SectionLabel>
      <View style={styles.stats}>
        <MoneyOverview stats={stats.data} />
      </View>
      <SectionLabel>{t('progress.activityStats')}</SectionLabel>
      <View style={styles.stats}>
        <StatGrid items={activityStats(stats.data, t)} />
      </View>

      <SectionLabel>{t('activity.section')}</SectionLabel>
      <Card>
        <AppText variant="smallStrong" color="forest" style={styles.chartTitle}>{t('activity.title')}</AppText>
        <ActivityChart period={period} onPeriod={setPeriod} activity={activity.data} />
      </Card>
      {activity.data ? (
        <Card>
          <ActivityInsights activity={activity.data} />
        </Card>
      ) : null}

      <SectionLabel>{t('progress.calendar')}</SectionLabel>
      <MonthCalendar
        month={nav.month}
        calendar={calendar.data}
        isLoading={calendar.isLoading}
        canGoNext={nav.canGoNext}
        onPrev={nav.goPrev}
        onNext={nav.goNext}
      />

      <SectionLabel>{t('progress.ledger')}</SectionLabel>
      {isParent ? pending.map((entry) => <SettlementConfirmCard key={entry.id} entry={entry} />) : null}
      {ledger.isLoading ? <LoadingView /> : <LedgerList entries={journal} />}
      {ledger.hasNextPage ? (
        <View style={styles.more}>
          <Button variant="ghost" size="sm" label={t('common.showMore')} loading={ledger.isFetchingNextPage} onPress={() => void ledger.fetchNextPage()} />
        </View>
      ) : null}

      {isParent ? (
        <>
          <SectionLabel>{t('progress.reminder')}</SectionLabel>
          <ReminderCard reminderTime={family.data.reminderTime} childName={family.data.counterpart.name ?? ''} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { paddingHorizontal: 16, marginBottom: 12 },
  chartTitle: { marginBottom: 10 },
  more: { alignItems: 'center', marginBottom: 12 },
});
