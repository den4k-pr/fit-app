import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { toIsoDate } from '@/lib/iso-date';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import type { LedgerEntry } from '@/types';
import { useResolveSettlement } from '../hooks/useResolveSettlement';

/**
 * Батько/мати: «Андрій зробив переказ €10» + «Так, отримано» / «Ні, не отримано» (ТЗ §6.4).
 * Кнопки великі й розведені (≥ 48 pt), щоб не натиснути помилково.
 */
export function SettlementConfirmCard({ entry }: { entry: LedgerEntry }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const resolve = useResolveSettlement();
  const busy = resolve.isPending;

  return (
    <Card tone="warning">
      <View style={styles.head}>
        <IconBadge icon="send" tone="gold" size={42} shape="squircle" />
        <View style={styles.texts}>
          <AppText variant="bodyStrong" color="pillGoldText">
            {t('settlement.pendingTitle', { name: entry.createdBy?.name ?? '', amount: fmt.money(entry.amount, entry.currency) })}
          </AppText>
          <AppText variant="caption" color="pillGoldText" style={styles.when}>
            {fmt.when(entry.createdAt, toIsoDate(new Date()))}
          </AppText>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button icon="check" label={t('settlement.accept')} loading={busy && resolve.variables?.accept === true} disabled={busy} onPress={() => resolve.mutate({ id: entry.id, accept: true })} />
        <Button variant="secondary" icon="x" label={t('settlement.reject')} loading={busy && resolve.variables?.accept === false} disabled={busy} onPress={() => resolve.mutate({ id: entry.id, accept: false })} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1 },
  when: { marginTop: 2, opacity: 0.8 },
  buttons: { gap: 10, marginTop: 16 },
});
