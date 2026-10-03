import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MonthCalendar } from '@/features/history/components/MonthCalendar';
import { useCalendarMonth } from '@/features/history/hooks/useCalendarMonth';
import { useMonthNavigation } from '@/features/history/hooks/useMonthNavigation';
import { formatTarget } from '@/lib/exercise-target';
import { ExerciseDetailRow } from '@/shared/components/ExerciseDetailRow';
import { FadeView } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { LoadingView } from '@/shared/ui/LoadingView';
import { colors } from '@/theme';
import type { ISODate } from '@/types';
import { usePlannedDay } from '../hooks/usePlannedDay';

/**
 * «Програма тренувань» (макет, «Сьогодні»): календар місяця (можна гортати вперед) і, по тапу на день,
 * склад цього дня — вправи, хвилини, на що впливають, джерело.
 */
export function ProgramCalendarCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const nav = useMonthNavigation(undefined, { allowFuture: true });
  const calendar = useCalendarMonth(nav.month);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const day = usePlannedDay(selected);

  const changeMonth = (go: () => void) => {
    setSelected(null);
    go();
  };

  return (
    <>
      <Card>
        <MonthCalendar
          bare
          month={nav.month}
          calendar={calendar.data}
          isLoading={calendar.isLoading}
          canGoNext={nav.canGoNext}
          onPrev={() => changeMonth(nav.goPrev)}
          onNext={() => changeMonth(nav.goNext)}
          onSelectDay={(date) => setSelected((d) => (d === date ? null : date))}
          selectedDate={selected}
        />
      </Card>
      {selected ? (
        <FadeView key={selected}>
          <Card style={styles.detail}>
            <AppText variant="smallStrong" color="forest">{fmt.longDate(selected)}</AppText>
            {day.isLoading ? <LoadingView /> : null}
            {day.data && (!day.data.planned || day.data.exercises.length === 0) ? (
              <AppText variant="small" color="muted" style={styles.empty}>{t('dayDetail.nothingPlanned')}</AppText>
            ) : null}
            <View>
              {day.data?.exercises.map((e, i, all) => (
                <ExerciseDetailRow key={e.exerciseId} name={e.name} info={e.info} target={formatTarget(e, t)} last={i === all.length - 1} />
              ))}
            </View>
          </Card>
        </FadeView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  detail: { borderColor: colors.green },
  empty: { marginTop: 8 },
});
