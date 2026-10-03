import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { ProgressBar } from '@/shared/ui/ProgressBar';

export interface TodayProgressCardProps {
  done: number;
  total: number;
}

/** «Виконано сьогодні: 2 з 4 вправ» + великий % і анімована смуга */
export function TodayProgressCard({ done, total }: TodayProgressCardProps) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Card>
      <View style={styles.top}>
        <IconBadge icon="target" tone="teal" size={40} shape="squircle" />
        <View style={styles.texts}>
          <AppText variant="bodyStrong">{t('dashboard.doneToday')}</AppText>
          <AppText variant="small" color="muted">{t('dashboard.exercisesOf', { done, total, count: total })}</AppText>
        </View>
        <AppText variant="statNumber" color="green" style={styles.pct}>{`${pct}%`}</AppText>
      </View>
      <ProgressBar value={done} max={total} height={10} />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  texts: { flex: 1 },
  pct: { fontSize: 26, fontVariant: ['tabular-nums'] },
});
