import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { borderWidth, colors, radius } from '@/theme';
import type { Activity } from '@/types';

interface Insight {
  key: string;
  up: boolean;
  icon: IconName;
  title: string;
  body: string;
  pct: number | null;
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** Друга половина періоду проти першої (як у макеті): зміна кроків у % і частки виконаних тренувань у п.п. */
export function activityTrend(activity: Activity) {
  const half = Math.floor(activity.buckets.length / 2);
  const first = activity.buckets.slice(0, half);
  const second = activity.buckets.slice(half);
  const stepsFirst = avg(first.map((b) => b.steps));
  const stepsSecond = avg(second.map((b) => b.steps));
  const rate = (list: typeof first) => {
    const planned = list.reduce((a, b) => a + b.planned, 0);
    return planned > 0 ? list.reduce((a, b) => a + b.workouts, 0) / planned : 0;
  };
  return {
    hasSteps: activity.buckets.some((b) => b.steps > 0),
    stepsDelta: stepsFirst > 0 ? Math.round(((stepsSecond - stepsFirst) / stepsFirst) * 100) : stepsSecond > 0 ? 100 : 0,
    trainDelta: Math.round((rate(second) - rate(first)) * 100),
  };
}

/**
 * «Аналіз активності» (макет): висновки з графіка — активність, кроки, регулярність тренувань,
 * гнучкість, сон і настрій. Тексти — загальні рекомендації, не медичні висновки.
 */
export function ActivityInsights({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  if (activity.buckets.length < 2) return null;
  const { hasSteps, stepsDelta, trainDelta } = activityTrend(activity);
  const period = t(`activity.periodPhrase.${activity.period}`);
  const overallDelta = hasSteps ? stepsDelta : trainDelta;
  const growing = overallDelta >= 0;
  const trainUp = trainDelta >= 0;
  const stepsUp = stepsDelta >= 0;
  // без змін — нейтральний висновок без «+0%» (раніше: «Активність зросла… +0%»)
  const trend = (delta: number) => (delta === 0 ? 'same' : delta > 0 ? 'up' : 'down');
  const pct = (delta: number) => (delta === 0 ? null : Math.abs(delta));

  const insights: Insight[] = [
    { key: 'overall', up: growing, icon: growing ? 'trending-up' : 'alert', title: t(`insights.overall.${trend(overallDelta)}`, { period }), body: t(`insights.overall.${trend(overallDelta)}Body` as 'insights.overall.upBody'), pct: pct(overallDelta) },
    hasSteps
      ? { key: 'steps', up: stepsUp, icon: 'footprints', title: t(`insights.steps.${trend(stepsDelta)}`), body: t(`insights.steps.${trend(stepsDelta)}Body` as 'insights.steps.upBody', { pct: Math.abs(stepsDelta) }), pct: pct(stepsDelta) }
      : { key: 'steps', up: true, icon: 'footprints', title: t('insights.steps.none'), body: t('insights.steps.noneBody'), pct: null },
    { key: 'workouts', up: trainUp, icon: trainUp ? 'dumbbell' : 'bell', title: t(`insights.workouts.${trend(trainDelta)}`), body: t(`insights.workouts.${trend(trainDelta)}Body` as 'insights.workouts.upBody', { pct: Math.abs(trainDelta) }), pct: pct(trainDelta) },
    { key: 'flex', up: growing, icon: 'stretch', title: t(`insights.flex.${growing ? 'up' : 'down'}`), body: t(`insights.flex.${growing ? 'upBody' : 'downBody'}`), pct: null },
    { key: 'sleep', up: growing, icon: 'sun', title: t(`insights.sleep.${growing ? 'up' : 'down'}`), body: t(`insights.sleep.${growing ? 'upBody' : 'downBody'}`), pct: null },
  ];

  return (
    <View>
      <AppText variant="smallStrong" color="forest" style={styles.title}>{t('insights.title')}</AppText>
      {insights.map((ins, i) => (
        <View key={ins.key} style={[styles.row, i < insights.length - 1 && styles.divider]}>
          <View style={[styles.icon, { backgroundColor: ins.up ? colors.greenLight : colors.redBg }]}>
            <Icon name={ins.icon} size={15} color={ins.up ? 'forest' : 'red'} />
          </View>
          <View style={styles.texts}>
            <AppText variant="smallStrong" color={ins.up ? 'forest' : 'red'}>{ins.title}</AppText>
            <AppText variant="caption" color="muted">{ins.body}</AppText>
          </View>
          {ins.pct !== null ? (
            <View style={[styles.pct, { backgroundColor: ins.up ? colors.greenLight : colors.redBg }]}>
              <AppText variant="captionStrong" color={ins.up ? 'forest' : 'red'}>{`${ins.up ? '+' : '−'}${ins.pct}%`}</AppText>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  texts: { flex: 1, gap: 2 },
  pct: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'center' },
});
