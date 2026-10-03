import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { borderWidth, colors, radius, shadows } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Перемикач із «повзунком» (`.rtrack` з макета): зелена пігулка плавно їде до обраного пункту. Нічого не перезавантажується:
 * змінюється лише вміст під перемикачем (використовується для «Телефон / Пошта»).
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(withSpring(index * segment, { damping: 20, stiffness: 240 }));
  }, [index, segment, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {segment > 0 ? <Animated.View style={[styles.thumb, { width: segment }, thumb]} /> : null}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.key)}
            style={styles.item}
          >
            {option.icon ? <Icon name={option.icon} size={20} color={selected ? 'white' : 'soft'} /> : null}
            <AppText variant="bodyStrong" color={selected ? 'white' : 'soft'}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.shade, borderRadius: radius.pill, padding: 4, borderWidth: borderWidth.thin, borderColor: colors.border },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: colors.greenButton, borderRadius: radius.pill, ...shadows.button },
  item: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
