import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { subMoney } from '@/lib/money-math';
import type { TFunction } from 'i18next';
import type { Family, FamilyStats } from '@/types';
import { PARENT_AVATAR } from '@/constants/relationships';
import { ROUTES } from '@/constants/routes';
import { NoFamilyState } from '@/features/family/components/NoFamilyState';
import { ParentSwitcher } from '@/features/family/components/ParentSwitcher';
import { parentLabelOf } from '@/features/family/hooks/useFamilies';
import { useApplyPendingPlan } from '@/features/family/hooks/useApplyPendingPlan';
import { useFamily } from '@/features/family/hooks/useFamily';
import { useFamilyStats } from '@/features/family/hooks/useFamilyStats';
import { useParentStatus } from '@/features/family/hooks/useParentStatus';
import { LedgerList } from '@/features/ledger/components/LedgerList';
import { MoneyOverview } from '@/features/ledger/components/MoneyOverview';
import { useLedger } from '@/features/ledger/hooks/useLedger';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { StatGrid, type StatCardProps } from '@/shared/ui/StatCard';
import { ParentStatusHeader } from '../components/ParentStatusHeader';
import { RemindBanner } from '../components/RemindBanner';
import { TodayProgressCard } from '../components/TodayProgressCard';
import { WeekPhotosList } from '../components/WeekPhotosList';
import { useWeekPhotos } from '../hooks/useWeekPhotos';

const DASHBOARD_LEDGER_ROWS = 5;

/**
 * Таб «Дашборд» дитини (ТЗ §7.1; макет `c-dashboard`): перемикач батьків (кілька батьків = кілька сімей),
 * банер «ще не займалася сьогодні» з «Нагадати», стан і баланс обраного батька, прогрес дня, фото, розрахунки.
 */
export function ChildDashboardScreen() {
  const family = useFamily();
  useApplyPendingPlan(family.data ?? undefined);

  if (family.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  // Дитина зареєструвалась, а батько/мати ще не приєднався: створюємо запрошення (ТЗ §5.5, §7.3).
  // Інші запити не йдуть, доки сім'ї немає.
  if (family.data === null) return <NoFamilyState />;
  if (!family.data) {
    return <Screen scroll={false}><ErrorState error={family.error} onRetry={() => void family.refetch()} /></Screen>;
  }
  return <DashboardContent family={family.data} />;
}

function DashboardContent({ family }: { family: Family }) {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useFamilyStats();
  const status = useParentStatus();
  const photos = useWeekPhotos();
  const ledger = useLedger();

  if (stats.isLoading || status.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (!stats.data || !status.data) {
    return <Screen scroll={false}><ErrorState error={stats.error ?? status.error} onRetry={() => { void stats.refetch(); void status.refetch(); }} /></Screen>;
  }

  const s = stats.data;
  const available = subMoney(s.owed, s.pendingTotal);
  const entries = ledger.data?.pages.flatMap((p) => p.items) ?? [];
  const label = parentLabelOf(family);

  const refresh = () => {
    void stats.refetch();
    void status.refetch();
    void photos.refetch();
    void ledger.refetch();
  };

  return (
    <Screen refreshing={stats.isRefetching || status.isRefetching} onRefresh={refresh}>
      <ParentSwitcher current={family} />
      <RemindBanner status={status.data} label={label} relationship={family.relationship} />
      <SectionLabel>{t('dashboard.sectionFor', { name: label })}</SectionLabel>
      <Card>
        <ParentStatusHeader status={status.data} avatar={PARENT_AVATAR[family.relationship]} />
        <View style={styles.actions}>
          <Button label={t('dashboard.settle')} icon="send" disabled={available <= 0} onPress={() => router.push(ROUTES.newSettlement)} />
          <Button variant="ghost" icon="edit" label={t('dashboard.editPlan')} onPress={() => router.navigate(ROUTES.childPlan)} />
        </View>
      </Card>

      {/* гроші й показники — на всю ширину екрана (у картці плитки ставали надто вузькими), як у «Прогресі» */}
      <SectionLabel>{t('money.section')}</SectionLabel>
      <View style={styles.grid}>
        <MoneyOverview stats={s} />
      </View>
      <SectionLabel>{t('progress.activityStats')}</SectionLabel>
      <View style={styles.grid}>
        <StatGrid items={activityStats(s, t)} />
      </View>

      <SectionLabel>{t('dashboard.progressToday')}</SectionLabel>
      <TodayProgressCard done={status.data.exercisesDone} total={status.data.exercisesTotal} />

      <SectionLabel>{t('dashboard.photos')}</SectionLabel>
      {photos.isLoading ? <LoadingView /> : <WeekPhotosList days={photos.data ?? []} />}

      <SectionLabel>{t('dashboard.ledger')}</SectionLabel>
      {ledger.isLoading ? <LoadingView /> : <LedgerList entries={entries} limit={DASHBOARD_LEDGER_ROWS} />}
      {entries.length > DASHBOARD_LEDGER_ROWS ? (
        <View style={styles.more}>
          <Button variant="ghost" size="sm" label={t('common.showAll')} onPress={() => router.navigate(ROUTES.childProgress)} />
        </View>
      ) : null}
    </Screen>
  );
}

/** Показники тренувань — однакові в обох акаунтах (дашборд дитини й «Прогрес» батьків) */
export function activityStats(s: FamilyStats, t: TFunction): StatCardProps[] {
  return [
    { value: String(s.daysCompleted), label: t('stats.daysCompleted'), icon: 'calendar-check', tone: 'shade' },
    { value: String(s.currentStreak), label: t('stats.streak'), icon: 'flame', tone: 'shade' },
    { value: `${s.completionPct}%`, label: t('stats.completion'), icon: 'trending-up', tone: 'shade' },
    { value: `${s.monthCompletedDays} / ${s.monthPlannedDays}`, label: t('money.facts.completedDays'), icon: 'calendar-check', tone: 'shade' },
  ];
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: 16, marginBottom: 12 },
  noFamily: { alignItems: 'center', gap: 10 },
  actions: { gap: 8, marginTop: 14 },
  more: { alignItems: 'center', marginBottom: 12 },
});
