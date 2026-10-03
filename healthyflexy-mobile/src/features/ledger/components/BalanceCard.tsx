import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import type { Currency, Money } from '@/types';

export interface BalanceCardProps {
  owed: Money;
  currency: Currency;
}

/** Великий баланс на темній картці: «€23 очікує переказу від дитини». Виведення немає: гроші переказує дитина. */
export function BalanceCard({ owed, currency }: BalanceCardProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <Card tone="dark">
      <View style={styles.top}>
        <IconBadge icon="wallet" tone="gold" size={42} shape="squircle" />
        <AppText variant="small" color="mutedOnDark" style={styles.label}>{t('account.owedLabel')}</AppText>
      </View>
      <AppText variant="bigNumber" color="mint" style={styles.amount}>{fmt.money(owed, currency)}</AppText>
      <AppText variant="small" color="mutedOnDark">{t('account.owedHint')}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1 },
  amount: { marginTop: 14, marginBottom: 10, fontSize: 38, lineHeight: 44, fontVariant: ['tabular-nums'] },
});
