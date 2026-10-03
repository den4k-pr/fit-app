import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { LoadingView } from '@/shared/ui/LoadingView';
import { TextField } from '@/shared/ui/TextField';
import { colors, radius } from '@/theme';
import { usePayouts } from '../hooks/usePayments';

/**
 * Виведення зароблених грошей (батько/мати) через Stripe Connect: спершу одноразове налаштування в Stripe
 * (особа й рахунок/картка — Stripe сам перевіряє й зберігає), далі — сума до «Доступно до виведення».
 */
export function PayoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { status, onboard, dashboard, withdraw } = usePayouts();
  const [amount, setAmount] = useState('');
  const data = status.data;
  const value = Number(amount.replace(',', '.'));
  const valid = !!data && Number.isFinite(value) && value > 0 && value <= data.available;

  const close = () => {
    setAmount('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('payments.payout.title')}
      onClose={close}
      closeLabel={t('common.close')}
      footer={
        !data ? null : data.payoutsEnabled ? (
          <Button
            label={valid ? t('payments.payout.withdrawAmount', { amount: fmt.money(value, data.currency) }) : t('payments.payout.withdraw')}
            icon="banknote"
            disabled={!valid}
            loading={withdraw.isPending}
            onPress={() => withdraw.mutate(Math.round(value * 100) / 100, { onSuccess: close })}
          />
        ) : (
          <Button label={t(data.connected ? 'payments.payout.continueSetup' : 'payments.payout.setup')} icon="arrow-right" loading={onboard.isPending} onPress={() => onboard.mutate()} />
        )
      }
    >
      {!data ? (
        <LoadingView />
      ) : (
        <View style={styles.wrap}>
          <View style={styles.available}>
            <AppText variant="caption" color="muted">{t('payments.payout.available')}</AppText>
            <AppText variant="bigNumber" color="forest">{fmt.money(data.available, data.currency)}</AppText>
          </View>
          {data.payoutsEnabled ? (
            <>
              <TextField label={t('payments.payout.amountLabel')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" icon="banknote" maxLength={8} />
              {data.available > 0 ? (
                <Button variant="ghost" size="sm" label={t('payments.payout.all')} onPress={() => setAmount(String(data.available))} />
              ) : (
                <AppText variant="caption" color="muted">{t('payments.payout.nothing')}</AppText>
              )}
              <Button variant="ghost" size="sm" icon="settings" label={t('payments.payout.manage')} loading={dashboard.isPending} onPress={() => dashboard.mutate()} />
            </>
          ) : (
            <AppText variant="small" color="soft">{t(data.connected ? 'payments.payout.pendingSetup' : 'payments.payout.setupHint')}</AppText>
          )}
          <AppText variant="caption" color="muted">{t('payments.payout.note')}</AppText>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  available: { backgroundColor: colors.greenLight, borderRadius: radius.md, padding: 14, gap: 2 },
});
