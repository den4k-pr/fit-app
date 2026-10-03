import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { borderWidth, colors } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface KeyValueRowProps {
  label: string;
  value: ReactNode;
  icon?: IconName;
  last?: boolean;
}

export function KeyValueRow({ label, value, icon, last }: KeyValueRowProps) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.left}>
        {icon ? <Icon name={icon} size={20} color="muted" /> : null}
        <AppText variant="bodyMedium" color="soft" style={styles.label}>{label}</AppText>
      </View>
      {/* назва тримає свою ширину, а довге значення («Пн, Вт, Ср…») переноситься праворуч — не навпаки */}
      {typeof value === 'string' ? <AppText variant="bodyStrong" align="right" style={styles.value}>{value}</AppText> : <View style={styles.valueBox}>{value}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0, maxWidth: '55%' },
  label: { flexShrink: 1 },
  value: { flexShrink: 1 },
  valueBox: { flexShrink: 1, alignItems: 'flex-end' },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
});
