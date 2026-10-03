import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PARENT_AVATAR } from '@/constants/relationships';
import { exerciseHref } from '@/constants/routes';
import { useFamily } from '@/features/family/hooks/useFamily';
import { useFamilyStats } from '@/features/family/hooks/useFamilyStats';
import { useFormat } from '@/shared/hooks/useFormat';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { showToast } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { ExerciseMode, ExerciseState, RelationshipType, type TodayExercise } from '@/types';
import { BodyImpactCard } from '../components/BodyImpactCard';
import { DayDoneCard } from '../components/DayDoneCard';
import { EarnBanner } from '../components/EarnBanner';
import { ExerciseList } from '../components/ExerciseList';
import { ProgramCalendarCard } from '../components/ProgramCalendarCard';
import { ProgressRing } from '../components/ProgressRing';
import { RestDayCard } from '../components/RestDayCard';
import { TodayHeader } from '../components/TodayHeader';
import { TodayStepsCard } from '../components/TodayStepsCard';
import { useToday } from '../hooks/useToday';

/**
 * Таб «Сьогодні» (ТЗ §6.2): шапка з привітанням і «До отримання», кільце прогресу, банер, список вправ.
 * Спеціальні стани: день відпочинку, все виконано, помилка завантаження.
 */
export function TodayScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = useToday();
  const family = useFamily();
  const stats = useFamilyStats();

  if (today.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (today.isError || !today.data) return <Screen scroll={false}><ErrorState error={today.error} onRetry={() => void today.refetch()} /></Screen>;

  const data = today.data;
  const avatar = PARENT_AVATAR[family.data?.relationship ?? RelationshipType.Other];
  const rateLabel = fmt.money(data.rate, data.currency);
  const done = data.session?.exercisesDone ?? 0;
  const total = data.session?.exercisesTotal ?? data.exercises.length;
  const allDone = !data.restDay && total > 0 && done >= total;

  const openExercise = (exercise: TodayExercise) => {
    if (exercise.state === ExerciseState.Locked) return showToast(t('today.lockedToast'));
    if (exercise.state === ExerciseState.Done) return showToast(t('today.doneToast'));
    if (exercise.state === ExerciseState.Skipped) return showToast(t('today.skippedToast'));
    return router.push(exerciseHref(exercise.exerciseId, data.session?.id));
  };

  return (
    <Screen refreshing={today.isRefetching} onRefresh={() => void today.refetch()}>
      <SectionLabel>{t('today.section')}</SectionLabel>
      <Card>
        <TodayHeader
          name={user?.name ?? ''}
          avatar={avatar}
          avatarUrl={user?.avatarUrl}
          localDate={data.localDate}
          month={stats.data ? { fund: stats.data.monthFund, earned: stats.data.monthEarned } : null}
          currency={data.currency}
        />
        {/* без програми (0 вправ) кільце «0/0» і «заробіть €5» лише плутають — не показуємо */}
        {data.restDay || !data.hasActiveProgram || total === 0 ? null : (
          <>
            <ProgressRing done={done} total={total} />
            {allDone ? null : <EarnBanner amountLabel={rateLabel} />}
          </>
        )}
      </Card>

      {data.restDay ? <RestDayCard nextPlanDate={data.nextPlanDate} streak={data.streak} /> : null}
      {/* з пропущеними вправами за день нараховано менше за ставку — показуємо фактичну суму */}
      {allDone ? <DayDoneCard amountLabel={fmt.money(data.session?.earned ?? data.rate, data.currency)} streak={data.streak} /> : null}

      {!data.restDay && !data.hasActiveProgram ? (
        <EmptyState title={t('today.noProgram.title')} description={t('today.noProgram.body')} />
      ) : null}

      {data.restDay || !data.hasActiveProgram ? null : (
        <>
          <SectionLabel>{t('today.exercises')}</SectionLabel>
          <ExerciseList exercises={data.exercises} onSelect={openExercise} />
          <SectionLabel>{t('body.section')}</SectionLabel>
          <BodyImpactCard impacts={data.exercises.map((e) => e.info.bodyImpact)} />
        </>
      )}

      {/* план від ШІ — без крокоміра */}
      {data.exerciseMode === ExerciseMode.Ai ? null : <TodayStepsCard />}

      <SectionLabel>{t('today.programCalendar')}</SectionLabel>
      <ProgramCalendarCard />
    </Screen>
  );
}
