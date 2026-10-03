import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { FadeView } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { IconBadge, type IconBadgeProps } from '@/shared/ui/IconBadge';
import { borderWidth, colors, type ColorToken } from '@/theme';
import { LedgerStatus, LedgerType, type ISODate, type LedgerEntry } from '@/types';

export interface LedgerItemProps {
  entry: LedgerEntry;
  today: ISODate;
  isLast?: boolean;
  /** Порядковий номер рядка: для ледь помітного каскаду появи */
  index?: number;
  /** Тап по нарахуванню → деталі (вправа, якість, вплив на організм) */
  onPress?: (entry: LedgerEntry) => void;
}

interface Look {
  icon: IconBadgeProps['icon'];
  tone: IconBadgeProps['tone'];
  amountColor: ColorToken;
  sign: '+' | '−' | '';
}

/** Вигляд запису: нарахування, «+» зелена; підтверджений переказ, «−» золота; очікує, годинник; відхилено, хрестик */
function lookOf(entry: LedgerEntry): Look {
  if (entry.type === LedgerType.Earn) return { icon: 'coins', tone: 'teal', amountColor: 'teal', sign: '+' };
  if (entry.status === LedgerStatus.Confirmed) return { icon: 'send', tone: 'gold', amountColor: 'gold', sign: '−' };
  if (entry.status === LedgerStatus.Pending) return { icon: 'clock', tone: 'muted', amountColor: 'muted', sign: '' };
  return { icon: 'x', tone: 'red', amountColor: 'muted', sign: '' };
}

/** Рядок журналу розрахунків: значок, «Сьогодні, 09:24» + опис, сума */
export function LedgerItem({ entry, today, isLast, index = 0, onPress }: LedgerItemProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const look = lookOf(entry);

  const description =
    entry.type === LedgerType.Earn
      ? entry.exerciseName
        ? t('ledger.earnExercise', { name: entry.exerciseName })
        : t('ledger.earn', { date: entry.sessionDate ? fmt.shortDate(entry.sessionDate) : '' })
      : t(`ledger.settlement.${entry.status}` as 'ledger.settlement.pending');

  return (
    <FadeView delay={Math.min(index, 8) * 45}>
      <Pressable
        disabled={!onPress || entry.type !== LedgerType.Earn}
        accessibilityRole={onPress && entry.type === LedgerType.Earn ? 'button' : undefined}
        onPress={() => onPress?.(entry)}
        style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && styles.pressed]}
      >
        <IconBadge icon={look.icon} tone={look.tone} size={38} shape="squircle" />
        <View style={styles.texts}>
          <AppText variant="bodyMedium">{fmt.when(entry.createdAt, today)}</AppText>
          <AppText variant="caption" color="muted">{description}</AppText>
        </View>
        <AppText variant="bodyStrong" color={look.amountColor} style={styles.amount}>
          {`${look.sign}${fmt.money(entry.amount, entry.currency)}`}
        </AppText>
      </Pressable>
    </FadeView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  divider: { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border },
  texts: { flex: 1 },
  pressed: { backgroundColor: colors.shade },
  amount: { fontVariant: ['tabular-nums'] },
});
