import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius, type ColorToken } from '@/theme';

export interface ProgressBarProps {
  value: number;
  max: number;
  height?: number;
  fill?: ColorToken;
}

/**
 * Смуга прогресу: заповнення плавно доїжджає до нового значення.
 * Анімується число (відсоток), а не рядок: `withTiming` усередині шаблонного рядка давав «[object Object]%»,
 * ширина ігнорувалась — і смуга завжди була повною («Помірно» з повною шкалою).
 */
export function ProgressBar({ value, max, height = 8, fill = 'green' }: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [pct, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }} style={[styles.track, { height }]}>
      <Animated.View style={[{ height: '100%', borderRadius: radius.pill, backgroundColor: colors[fill] }, bar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.shade, borderRadius: radius.pill, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
