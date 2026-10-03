import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import { ToggleRow } from '@/shared/ui/ToggleRow';
import { borderWidth, colors, radius } from '@/theme';
import type { TopupInterval } from '@/types';
import { useAutoTopup } from '../hooks/usePayments';

/**
 * Автопоповнення фонду (макет «Настроить автоплатеж»): збережена картка, сума, щотижня / щомісяця.
 * BLIK для автосписань не підходить — лише картка (у т.ч. Apple Pay / Google Pay).
 */
export function AutoTopupSheet({ visible, onClose, suggested }: { visible: boolean; onClose: () => void; suggested: number }) {
  const { query } = useAutoTopup();
  // форма перемонтовується, коли змінюються збережені налаштування — без синхронізації стану в useEffect
  const key = JSON.stringify(query.data ?? null);
  return <AutoTopupForm key={key} visible={visible} onClose={onClose} suggested={suggested} />;
}

function AutoTopupForm({ visible, onClose, suggested }: { visible: boolean; onClose: () => void; suggested: number }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { query, save, saveCard } = useAutoTopup();
  const data = query.data;
  const [amount, setAmount] = useState(String(data?.amount ?? (suggested > 0 ? Math.ceil(suggested) : 50)));
  const [interval, setInterval] = useState<TopupInterval>(data?.interval ?? 'month');
  const [active, setActive] = useState(data?.active ?? false);

  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 2;

  return (
    <BottomSheet
      visible={visible}
      title={t('payments.auto.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={
        data?.card ? (
          <Button label={t('common.save')} icon="check" disabled={!valid} loading={save.isPending} onPress={() => save.mutate({ amount: Math.round(value * 100) / 100, interval, active }, { onSuccess: onClose })} />
        ) : (
          <Button label={t('payments.auto.addCard')} icon="plus" loading={saveCard.isPending} onPress={() => saveCard.mutate()} />
        )
      }
    >
      <View style={styles.wrap}>
        <AppText variant="small" color="soft">{t('payments.auto.hint')}</AppText>
        {data?.card ? (
          <View style={styles.card}>
            <AppText variant="smallStrong">{`${(data.card.brand ?? 'card').toUpperCase()} •••• ${data.card.last4}`}</AppText>
            <Button variant="ghost" size="sm" label={t('payments.auto.changeCard')} loading={saveCard.isPending} onPress={() => saveCard.mutate()} />
          </View>
        ) : null}
        {data?.card ? (
          <>
            <ToggleRow icon="refresh" label={t('payments.auto.enable')} value={active} onValueChange={setActive} />
            <TextField label={t('money.fund.amountLabel')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" icon="piggy" maxLength={8} />
            <SegmentedControl<TopupInterval>
              value={interval}
              onChange={setInterval}
              options={[
                { key: 'week', label: t('payments.auto.weekly') },
                { key: 'month', label: t('payments.auto.monthly') },
              ]}
            />
            {data.active && data.nextRunAt ? (
              <AppText variant="caption" color="muted">{t('payments.auto.next', { date: fmt.longDate(data.nextRunAt.slice(0, 10)) })}</AppText>
            ) : null}
            {data.lastError ? <AppText variant="caption" color="red">{t('payments.auto.lastError')}</AppText> : null}
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: borderWidth.thin, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 },
});
