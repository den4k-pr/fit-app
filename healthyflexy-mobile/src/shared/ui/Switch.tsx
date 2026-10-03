import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, radius, shadows } from '@/theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

const TRACK_W = 52;
const TRACK_H = 30;
const KNOB = 24;

/** Перемикач (`.tog`): тумблер пружинно їде, доріжка плавно змінює колір (green / border) */
export function Switch({ value, onValueChange, accessibilityLabel }: SwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, progress]);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.border, colors.green]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? TRACK_W - KNOB - 3 : 3, { damping: 16, stiffness: 260 }) }],
  }));
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value }} hitSlop={10} onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: TRACK_W, height: TRACK_H, borderRadius: radius.pill, justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.surface, ...shadows.card },
});
