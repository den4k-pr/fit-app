import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { isoWeekdayOf } from '@/lib/iso-date';
import { useFormat } from '@/shared/hooks/useFormat';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { borderWidth, colors, fonts, radius } from '@/theme';
import type { Activity, ActivityPeriod } from '@/types';

export const ACTIVITY_PERIODS: ActivityPeriod[] = ['7', '30', '90', '180', '365', 'all'];

const HEIGHT = 130;
const PAD = 22;

/** Підпис осі кроків: 750 → «750», 1500 → «1.5k», 2000 → «2k» */
const axisLabel = (value: number): string =>
  value < 1000 ? String(Math.round(value)) : `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;

/** Кожен n-й підпис осі, щоб не злипались (макет: skip) */
const labelEvery = (count: number) => (count <= 7 ? 1 : count <= 13 ? 2 : count <= 18 ? 3 : 5);

export interface ActivityChartProps {
  period: ActivityPeriod;
  onPeriod: (period: ActivityPeriod) => void;
  activity: Activity | undefined;
}

/**
 * «Кроки і тренування» (макет, «Прогрес»): зелені стовпчики — середні кроки за відрізок, лінія тренду;
 * золоті — тренування (частка виконаних днів відрізка). Період: 7 днів · Місяць · 3 міс · 6 міс · Рік · Весь час.
 */
export function ActivityChart({ period, onPeriod, activity }: ActivityChartProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [width, setWidth] = useState(0);
  const buckets = activity?.buckets ?? [];
  const maxSteps = Math.max(1, ...buckets.map((b) => b.steps));
  const hasSteps = buckets.some((b) => b.steps > 0);
  const cols = Math.max(1, buckets.length);
  const colW = (width - PAD * 2) / cols;
  const plotH = HEIGHT - PAD * 2;
  const every = labelEvery(cols);

  const label = (from: string, to: string) => {
    if (activity?.granularity === 'month') return fmt.monthTitle(from.slice(0, 7)).slice(0, 3);
    if (activity?.granularity === 'week') return fmt.shortDate(to);
    return cols <= 7 ? fmt.weekdayNames('short')[isoWeekdayOf(from) - 1] : String(Number(from.slice(8, 10)));
  };
  const stepY = (steps: number) => HEIGHT - PAD - Math.max(2, (plotH * steps) / maxSteps);

  return (
    <View>
      {/* усі періоди видно одразу (переносяться в другий рядок); у горизонтальному скролі «6 месяце…» обрізалось
          краєм картки, і «Год» / «Все время» ніхто не знаходив */}
      <View style={styles.periods}>
        {ACTIVITY_PERIODS.map((p) => {
          const active = p === period;
          return (
            <PressableScale key={p} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onPeriod(p)} style={[styles.period, active && styles.periodActive]}>
              <AppText variant="captionStrong" color={active ? 'white' : 'muted'}>{t(`activity.period.${p}`)}</AppText>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.chart} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && buckets.length > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {[0, 0.5, 1].map((f) => {
              const y = PAD + plotH * (1 - f);
              return (
                <Line key={f} x1={PAD} y1={y} x2={width - PAD} y2={y} stroke={colors.shade} strokeWidth={1} />
              );
            })}
            {/* підписи осі — лише коли кроки є (інакше виходило «0k, 0k»); до 1000 — числом, далі «1.5k» */}
            {hasSteps
              ? [0.5, 1].map((f) => (
                  <SvgText key={`v${f}`} x={PAD - 3} y={PAD + plotH * (1 - f) + 3} fontSize={8} fill={colors.muted} textAnchor="end">
                    {axisLabel(maxSteps * f)}
                  </SvgText>
                ))
              : null}
            {buckets.map((b, i) => {
              const h = Math.max(2, (plotH * b.steps) / maxSteps);
              return <Rect key={`s${b.from}`} x={PAD + i * colW + colW * 0.08} y={HEIGHT - PAD - h} width={colW * 0.42} height={h} rx={2} fill={`${colors.green}40`} />;
            })}
            {buckets.map((b, i) => {
              if (b.workouts === 0) return null;
              const share = b.planned > 0 ? Math.min(1, b.workouts / b.planned) : 1;
              const h = Math.max(4, plotH * 0.55 * share);
              return <Rect key={`w${b.from}`} x={PAD + i * colW + colW * 0.52} y={HEIGHT - PAD - h} width={colW * 0.38} height={h} rx={2} fill={`${colors.gold}80`} />;
            })}
            <Polyline
              points={buckets.map((b, i) => `${PAD + i * colW + colW * 0.29},${stepY(b.steps)}`).join(' ')}
              fill="none"
              stroke={colors.green}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {buckets.map((b, i) =>
              i % every === 0 || i === cols - 1 ? (
                <Circle key={`c${b.from}`} cx={PAD + i * colW + colW * 0.29} cy={stepY(b.steps)} r={3} fill={colors.green} />
              ) : null,
            )}
            {buckets.map((b, i) =>
              i % every === 0 || i === cols - 1 ? (
                <SvgText key={`l${b.from}`} x={PAD + i * colW + colW / 2} y={HEIGHT - 4} fontSize={8} fill={colors.muted} textAnchor="middle" fontFamily={fonts.mono}>
                  {label(b.from, b.to)}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.green }]} />
          <AppText variant="caption" color="muted">{t('activity.steps')}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.gold }]} />
          <AppText variant="caption" color="muted">{t('activity.workouts')}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10 },
  period: { borderWidth: borderWidth.medium, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  periodActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  chart: { width: '100%' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 3, borderRadius: 2 },
});
