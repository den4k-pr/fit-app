import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { borderWidth, colors } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}

/** Чекбокс із великою зоною дотику (≥ 48 pt): заливка зеленим і галочка «виростає» пружиною */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(checked ? colors.green : colors.surface, { duration: 160 }),
    borderColor: withTiming(checked ? colors.green : colors.border, { duration: 160 }),
    transform: [{ scale: withSpring(checked ? 1 : 0.96, { damping: 12, stiffness: 260 }) }],
  }));
  const tick = useAnimatedStyle(() => ({
    opacity: withTiming(checked ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withSpring(checked ? 1 : 0.4, { damping: 10, stiffness: 300 }) }],
  }));
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.row}>
      <Animated.View style={[styles.box, box]}>
        <Animated.View style={tick}>
          <Icon name="check" size={18} color="white" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
      <View style={styles.label}>{typeof label === 'string' ? <AppText variant="small" color="soft">{label}</AppText> : label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 52, paddingVertical: 8 },
  box: { width: 28, height: 28, borderRadius: 6, borderWidth: borderWidth.medium, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  label: { flex: 1 },
});
