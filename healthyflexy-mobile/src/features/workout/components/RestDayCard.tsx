import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { RestIllustration } from '@/shared/illustrations';
import { AppText } from '@/shared/ui/AppText';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import type { ISODate } from '@/types';

export interface RestDayCardProps {
  nextPlanDate: ISODate | null;
  streak: number;
}

/** День відпочинку: спокійна ілюстрація, коли наступне заняття, серія */
export function RestDayCard({ nextPlanDate, streak }: RestDayCardProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <Card style={styles.card}>
      <RestIllustration size={180} />
      <AppText variant="h2" align="center">{t('today.rest.title')}</AppText>
      {nextPlanDate ? <AppText variant="body" color="soft" align="center">{t('today.rest.next', { day: fmt.weekday(nextPlanDate) })}</AppText> : null}
      {streak > 0 ? <View><Badge tone="warning" icon="flame" label={t('today.streak', { count: streak })} /></View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 20 },
});
