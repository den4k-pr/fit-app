import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PressableScale } from '@/shared/motion';
import { borderWidth, colors, radius } from '@/theme';
import { Icon } from './Icon';

export interface SelectTileProps {
  selected: boolean;
  /** Недоступна (напр., досягнуто ліміт вибору): напівпрозора й не натискається */
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  /** Показувати галочку в куті обраної плитки */
  showCheck?: boolean;
  /** Стиль зовнішньої обгортки (ширина: flex/width) */
  style?: StyleProp<ViewStyle>;
  /** Стиль самої плитки (відступи, вирівнювання вмісту) */
  innerStyle?: StyleProp<ViewStyle>;
}

/**
 * Спільна плитка вибору (валюта, мова, ким є для вас батько/мати): фон і рамка плавно змінюються, натискання дає
 * легку пружину й вібрацію. Замість купи однакових Pressable з різними стилями.
 */
export function SelectTile({ selected, disabled, onPress, accessibilityLabel, children, showCheck, style, innerStyle }: SelectTileProps) {
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.greenLight : colors.surface, { duration: 180 }),
    borderColor: withTiming(selected ? colors.green : colors.border, { duration: 180 }),
  }));
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ selected, disabled }} accessibilityLabel={accessibilityLabel} onPress={onPress} disabled={disabled} haptic style={[style, disabled && styles.disabled]}>
      <Animated.View style={[styles.tile, box, innerStyle]}>
        {children}
        {showCheck && selected ? (
          <View style={styles.check} pointerEvents="none">
            <Icon name="check-circle" size={18} color="green" />
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, borderWidth: borderWidth.medium, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  check: { position: 'absolute', top: 6, right: 6 },
  disabled: { opacity: 0.45 },
});
