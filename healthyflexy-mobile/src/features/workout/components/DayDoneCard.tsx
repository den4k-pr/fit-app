import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CelebrationIllustration } from '@/shared/illustrations';
import { AppText } from '@/shared/ui/AppText';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';

export interface DayDoneCardProps {
  amountLabel: string;
  streak: number;
}

/** Усі вправи дня виконано: святкова ілюстрація, заробіток, серія */
export function DayDoneCard({ amountLabel, streak }: DayDoneCardProps) {
  const { t } = useTranslation();
  return (
    <Card tone="success" style={styles.card}>
      <CelebrationIllustration size={130} />
      <AppText variant="h3" align="center">{t('today.allDone', { amount: amountLabel })}</AppText>
      {streak > 0 ? <View><Badge tone="warning" icon="flame" label={t('today.streak', { count: streak })} /></View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 6 },
});
