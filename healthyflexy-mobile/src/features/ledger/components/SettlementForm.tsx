import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { toApiError } from '@/api/errors';
import { useFormat } from '@/shared/hooks/useFormat';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { TextField } from '@/shared/ui/TextField';
import type { Currency, Money } from '@/types';
import { useCreateSettlement } from '../hooks/useCreateSettlement';

export interface SettlementFormProps {
  /** owed − pending: більше вказати не можна (ТЗ §7.1) */
  available: Money;
  currency: Currency;
  onDone: () => void;
}

/** Форма «Переказ зроблено»: сума за замовчуванням = доступне, максимум = доступне */
export function SettlementForm({ available, currency, onDone }: SettlementFormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const create = useCreateSettlement();
  const [text, setText] = useState(String(available));

  const amount = Number(text.replace(',', '.'));
  const invalid = !Number.isFinite(amount) || amount <= 0 || amount > available;
  const error = text.length > 0 && invalid ? t('settlement.amountInvalid', { max: fmt.money(available, currency) }) : undefined;

  const submit = () => {
    create.mutate(
      { amount: Math.round(amount * 100) / 100 },
      { onSuccess: onDone },
    );
  };

  return (
    <View>
      <Card>
        <TextField
          label={t('settlement.amount', { symbol: fmt.money(0, currency).replace(/[\d\s.,]/g, '') })}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          icon="banknote"
          error={error ?? (create.error ? t(`errors.${toApiError(create.error).code}`) : undefined)}
          hint={t('settlement.hint')}
          maxLength={8}
        />
      </Card>
      <View style={styles.actions}>
        <Button label={t('settlement.submit')} icon="send" loading={create.isPending} disabled={invalid} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 16, paddingTop: 4 },
});
