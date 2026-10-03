import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useDayDetail } from '@/features/dashboard/hooks/useDayDetail';
import { ExerciseDetailRow } from '@/shared/components/ExerciseDetailRow';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Divider } from '@/shared/ui/Divider';
import { LoadingView } from '@/shared/ui/LoadingView';
import type { LedgerEntry } from '@/types';

/**
 * Деталі нарахування (макет, тап по «+€» у журналі): за яку вправу, якість виконання (оцінка AI),
 * на які системи організму впливає, м'язи, джерело. Старі записи «за день» показують усі вправи дня.
 */
export function EarnDetailSheet({ entry, onClose }: { entry: LedgerEntry | null; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const day = useDayDetail(entry?.sessionDate ?? null);
  const records = (day.data?.records ?? []).filter(
    (r) => !entry?.exerciseRecordId || r.id === entry.exerciseRecordId,
  );

  return (
    <BottomSheet
      visible={entry !== null}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={<Button variant="secondary" label={t('common.close')} onPress={onClose} />}
    >
      {entry ? (
        <>
          <View style={styles.head}>
            <View style={styles.flex}>
              <AppText variant="h3">{entry.sessionDate ? fmt.longDate(entry.sessionDate) : ''}</AppText>
              <AppText variant="small" color="muted">{entry.exerciseName ?? t('ledger.dayCompleted')}</AppText>
            </View>
            <AppText variant="h2" color="green">{`+${fmt.money(entry.amount, entry.currency)}`}</AppText>
          </View>
          <Divider />
          <AppText variant="sectionLabel" color="muted">{t('dayDetail.exercises').toUpperCase()}</AppText>
          {day.isLoading ? <LoadingView /> : null}
          {records.map((r, i) => (
            <ExerciseDetailRow
              key={r.id}
              name={r.exerciseName}
              info={r.info ?? { category: 'strength', workoutTypes: [], durationMin: 0, bodyImpact: null, muscles: [], sourceTitle: null, sourceUrl: null, benefit: '', description: null, voicePattern: null, variantGroup: null }}
              target={r.steps !== null ? t('exercise.steps', { count: r.steps }) : undefined}
              quality={r.aiScore ?? null}
              last={i === records.length - 1}
            />
          ))}
          <AppText variant="caption" color="muted">{t('dayDetail.creditedAt', { time: fmt.time(entry.createdAt) })}</AppText>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
});
