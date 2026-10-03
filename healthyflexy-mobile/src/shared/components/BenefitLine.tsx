import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import type { ColorToken } from '@/theme';

export interface BenefitLineProps {
  benefit: string | null | undefined;
  /** Скільки рядків показати (у списках — 2) */
  lines?: number;
  muted?: boolean;
}

/** Коротка «Користь» вправи поруч із назвою: у списку дня, у програмах, у каталозі, у деталях дня */
export function BenefitLine({ benefit, lines = 2, muted }: BenefitLineProps) {
  if (!benefit) return null;
  const color: ColorToken = muted ? 'muted' : 'soft';
  return (
    <View style={styles.row}>
      <Icon name="sparkles" size={13} color={muted ? 'muted' : 'teal'} />
      <AppText variant="caption" color={color} numberOfLines={lines} style={styles.text}>{benefit}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 2 },
  text: { flex: 1 },
});
