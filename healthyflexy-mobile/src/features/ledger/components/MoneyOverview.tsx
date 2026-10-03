import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { IconBadge } from '@/shared/ui/IconBadge';
import type { IconName } from '@/shared/ui/Icon';
import { SelectTile } from '@/shared/ui/SelectTile';
import { StatGrid } from '@/shared/ui/StatCard';
import { TextField } from '@/shared/ui/TextField';
import { useAuthStore } from '@/store/auth.store';
import { borderWidth, colors, radius } from '@/theme';
import { UserRole, type FamilyStats } from '@/types';
import { AutoTopupSheet } from '@/features/payments/components/AutoTopupSheet';
import { PayoutSheet } from '@/features/payments/components/PayoutSheet';
import { usePaymentsConfig, useStripeTopup } from '@/features/payments/hooks/usePayments';
import { useFundDeposit } from '../hooks/useFundDeposit';

type MoneyKey = 'fund' | 'earned' | 'settled' | 'owed';

const ICON: Record<MoneyKey, IconName> = { fund: 'piggy', earned: 'coins', settled: 'banknote', owed: 'wallet' };

/** Швидкі суми поповнення фонду: на скільки місяців занять (за поточного плану) */
const QUICK_MONTHS = [1, 3, 6, 12] as const;
/** Верхня межа одного поповнення (як на сервері) */
const MAX_DEPOSIT = 999999.99;

/**
 * Гроші сім'ї — ОДНАКОВО в обох акаунтах (спонсор і батько/мати бачать ті самі плитки з тими самими назвами):
 * «Фонд» (закладені спонсором гроші — на місяць, рік чи будь-який строк — і на скільки їх вистачить),
 * «Зароблено за активність», «Виплачено всього», «До виплати».
 * Тап по плитці — аркуш із простим поясненням і цифрами; спонсор поповнює фонд з аркуша «Фонд».
 */
export function MoneyOverview({ stats }: { stats: FamilyStats }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const isSponsor = useAuthStore((s) => s.user?.role === UserRole.Child);
  const [open, setOpen] = useState<MoneyKey | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const payments = usePaymentsConfig();
  const money = (v: number) => fmt.money(v, stats.currency);

  const fundBalance = stats.fundBalance ?? 0;
  const fundMonths = stats.fundMonths ?? 0;
  const values: Record<MoneyKey, number> = {
    fund: fundBalance,
    earned: stats.earnedTotal,
    settled: stats.settledTotal,
    owed: stats.owed,
  };
  const fundHint =
    fundBalance <= 0
      ? t(isSponsor ? 'money.fund.hintEmptySponsor' : 'money.fund.hintEmpty')
      : fundMonths >= 1
        ? t('money.fund.hintMonths', { months: fmt.amount(fundMonths) })
        : t('money.fund.hintLessThanMonth');
  const hints: Record<MoneyKey, string> = {
    fund: fundHint,
    earned: t('money.earned.hint', { amount: money(stats.monthEarned) }),
    settled: t('money.settled.hint'),
    owed: stats.pendingTotal > 0 ? t('money.owed.pending', { amount: money(stats.pendingTotal) }) : t('money.owed.hint'),
  };

  return (
    <View>
      <StatGrid
        items={(['fund', 'earned', 'settled', 'owed'] as MoneyKey[]).map((key) => ({
          value: money(values[key]),
          label: t(`money.${key}.label`),
          hint: hints[key],
          icon: ICON[key],
          tone: key === 'fund' ? 'gold' : key === 'earned' ? 'forest' : 'shade',
          onPress: () => setOpen(key),
        }))}
      />
      <AppText variant="micro" color="muted" align="center" style={styles.tapHint}>{t('money.tapHint')}</AppText>

      <BottomSheet
        visible={open !== null}
        title={open ? t(`money.${open}.label`) : undefined}
        onClose={() => setOpen(null)}
        closeLabel={t('common.close')}
        footer={
          open === 'fund' && isSponsor ? (
            <Button
              label={t('money.fund.deposit')}
              icon="plus"
              onPress={() => {
                setOpen(null);
                setDepositOpen(true);
              }}
            />
          ) : open === 'owed' && !isSponsor && payments.data?.enabled ? (
            // батько/мати: вивести зароблене через Stripe Connect
            <Button
              label={t('payments.payout.title')}
              icon="banknote"
              onPress={() => {
                setOpen(null);
                setPayoutOpen(true);
              }}
            />
          ) : (
            <Button label={t('money.gotIt')} onPress={() => setOpen(null)} />
          )
        }
      >
        {open ? (
          <View style={styles.sheet}>
            <View style={styles.valueRow}>
              <IconBadge icon={ICON[open]} tone={open === 'fund' ? 'gold' : 'teal'} size={52} shape="squircle" />
              <AppText variant="bigNumber" color="forest" style={styles.value}>{money(values[open])}</AppText>
            </View>
            <AppText variant="body" color="soft">{t(`money.${open}.explain`)}</AppText>
            <View style={styles.facts}>
              {open === 'fund' ? (
                <>
                  <Fact label={t('money.facts.fundDeposited')} value={money(stats.fundDeposited ?? 0)} />
                  <Fact label={t('money.facts.fundMonthlyCost')} value={money(stats.fundMonthlyCost ?? 0)} />
                  <Fact
                    label={t('money.facts.fundEnoughFor')}
                    value={fundBalance > 0 ? t('money.facts.months', { months: fmt.amount(fundMonths) }) : '—'}
                  />
                  <Fact
                    label={t('money.facts.fundUntil')}
                    value={stats.fundCoversUntil ? fmt.longDate(stats.fundCoversUntil) : '—'}
                  />
                </>
              ) : null}
              {open === 'earned' ? (
                <>
                  <Fact label={t('money.facts.monthEarned')} value={money(stats.monthEarned)} />
                  <Fact label={t('money.facts.daysCompleted')} value={String(stats.daysCompleted)} />
                </>
              ) : null}
              {open === 'settled' ? <Fact label={t('money.facts.pending')} value={money(stats.pendingTotal)} /> : null}
              {open === 'owed' ? (
                <>
                  <Fact label={t('money.earned.label')} value={money(stats.earnedTotal)} />
                  <Fact label={t('money.settled.label')} value={`− ${money(stats.settledTotal)}`} />
                </>
              ) : null}
            </View>
          </View>
        ) : null}
      </BottomSheet>

      {isSponsor ? (
        <FundDepositSheet visible={depositOpen} onClose={() => setDepositOpen(false)} stats={stats} />
      ) : (
        <PayoutSheet visible={payoutOpen} onClose={() => setPayoutOpen(false)} />
      )}
    </View>
  );
}

/** Поповнення фонду: довільна сума або «на 1 / 3 / 6 / 12 місяців» за поточним планом */
/**
 * Поповнення фонду. Якщо на сервері підключено Stripe (і збірка його містить) — справжня оплата: картка, Apple Pay,
 * Google Pay, BLIK (у злотих), PayPal; фонд зростає лише після підтвердження оплати сервером. Інакше — облікове
 * поповнення (гроші передаються поза застосунком, як і раніше).
 */
function FundDepositSheet({ visible, onClose, stats }: { visible: boolean; onClose: () => void; stats: FamilyStats }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const deposit = useFundDeposit();
  const payments = usePaymentsConfig();
  const topup = useStripeTopup();
  const [autoOpen, setAutoOpen] = useState(false);
  const realMoney = payments.canPay;
  const [text, setText] = useState('');
  const monthly = stats.fundMonthlyCost ?? 0;
  const amount = Number(text.replace(',', '.'));
  const valid = Number.isFinite(amount) && amount > 0 && amount <= MAX_DEPOSIT;

  const close = () => {
    setText('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('money.fund.deposit')}
      onClose={close}
      closeLabel={t('common.close')}
      footer={
        <Button
          label={
            valid
              ? t(realMoney ? 'payments.topup.payAmount' : 'money.fund.depositAmount', { amount: fmt.money(amount, stats.currency) })
              : t('money.fund.deposit')
          }
          icon={realMoney ? 'wallet' : 'check'}
          disabled={!valid}
          loading={deposit.isPending || topup.isPending}
          onPress={() => {
            const value = Math.round(amount * 100) / 100;
            if (realMoney) topup.mutate(value, { onSuccess: (result) => result !== 'canceled' && close() });
            else deposit.mutate({ amount: value }, { onSuccess: close });
          }}
        />
      }
    >
      <View style={styles.sheet}>
        <AppText variant="small" color="soft">{t('money.fund.depositHint')}</AppText>
        <TextField
          label={t('money.fund.amountLabel')}
          value={text}
          onChangeText={(v) => setText(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          icon="piggy"
          maxLength={10}
        />
        {monthly > 0 ? (
          <View style={styles.quick}>
            {QUICK_MONTHS.map((months) => {
              const value = Math.round(monthly * months * 100) / 100;
              const selected = Math.abs(amount - value) < 0.005;
              return (
                <SelectTile
                  key={months}
                  selected={selected}
                  accessibilityLabel={t('money.fund.forMonths', { count: months })}
                  onPress={() => setText(String(value))}
                  style={styles.quickCell}
                  innerStyle={styles.quickTile}
                >
                  <AppText variant="smallStrong" color={selected ? 'forest' : 'soft'}>{t('money.fund.forMonths', { count: months })}</AppText>
                  <AppText variant="caption" color="muted">{fmt.money(value, stats.currency)}</AppText>
                </SelectTile>
              );
            })}
          </View>
        ) : null}
        <AppText variant="caption" color="muted">{t(realMoney ? 'payments.topup.methods' : 'money.fund.depositNote')}</AppText>
        {realMoney ? (
          <Button variant="ghost" size="sm" icon="refresh" label={t('payments.auto.title')} onPress={() => setAutoOpen(true)} />
        ) : null}
      </View>
      {realMoney ? <AutoTopupSheet visible={autoOpen} onClose={() => setAutoOpen(false)} suggested={monthly} /> : null}
    </BottomSheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="small" color="muted" style={styles.factLabel}>{label}</AppText>
      <AppText variant="smallStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tapHint: { marginTop: 6 },
  sheet: { gap: 14 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  value: { flex: 1, fontVariant: ['tabular-nums'] },
  facts: { backgroundColor: colors.shade, borderColor: colors.border, borderWidth: borderWidth.thin, borderRadius: radius.md, paddingHorizontal: 14 },
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border, gap: 12 },
  factLabel: { flex: 1 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  quickCell: { width: '48.5%' },
  quickTile: { minHeight: 58, gap: 2 },
});
