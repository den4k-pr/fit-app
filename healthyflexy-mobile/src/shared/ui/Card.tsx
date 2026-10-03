import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { PressableScale, useRevealStyle, useStaggerDelay } from '@/shared/motion';
import { borderWidth, colors, layout, radius, shadows } from '@/theme';

export interface CardProps {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'error' | 'muted' | 'dark';
  /** Без внутрішніх відступів (списки з рядками на всю ширину) */
  flush?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Вимкнути плавну появу (наприклад, картка всередині вже анімованого блоку) */
  still?: boolean;
}

const TONES = {
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  success: { backgroundColor: colors.tealBg, borderColor: colors.tealBorder },
  warning: { backgroundColor: colors.pillGoldBg, borderColor: colors.pillGoldBorder },
  error: { backgroundColor: colors.redBg, borderColor: colors.redBorder },
  muted: { backgroundColor: colors.shade, borderColor: colors.border },
  dark: { backgroundColor: colors.forest, borderColor: colors.forest },
} as const;

/** Картка (`.card`): біла, тонка зелена рамка, легка тінь, радіус 16. Кожна картка сама з'являється каскадом (див. shared/motion). */
export function Card({ children, tone = 'default', flush, onPress, style, still }: CardProps) {
  const delay = useStaggerDelay();
  const reveal = useRevealStyle(still ? 0 : delay, still ? 0 : 14);
  const box = [styles.card, TONES[tone], tone === 'default' || tone === 'dark' ? shadows.card : null, flush ? styles.flush : styles.padded, style];
  return (
    <Animated.View style={[styles.outer, reveal]}>
      {onPress ? (
        <PressableScale accessibilityRole="button" onPress={onPress} haptic scaleTo={0.985} style={box}>
          {children}
        </PressableScale>
      ) : (
        <View style={box}>{children}</View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginHorizontal: layout.screenPadding, marginBottom: layout.cardGap },
  card: { borderWidth: borderWidth.thin, borderRadius: radius.lg },
  padded: { padding: 16 },
  flush: { padding: 0, overflow: 'hidden' },
});
