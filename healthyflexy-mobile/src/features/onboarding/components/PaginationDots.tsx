import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { colors } from '@/theme';

export interface PaginationDotsProps {
  count: number;
  /** Позиція гортання в пікселях і ширина сторінки: крапка плавно розтягується за пальцем */
  scrollX: SharedValue<number>;
  pageWidth: number;
}

function Dot({ i, scrollX, pageWidth }: { i: number; scrollX: SharedValue<number>; pageWidth: number }) {
  const style = useAnimatedStyle(() => {
    const range = [(i - 1) * pageWidth, i * pageWidth, (i + 1) * pageWidth];
    return {
      width: interpolate(scrollX.value, range, [8, 28, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.value, range, [colors.border, colors.green, colors.border]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export function PaginationDots({ count, scrollX, pageWidth }: PaginationDotsProps) {
  return (
    <View style={styles.row} accessibilityElementsHidden>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} scrollX={scrollX} pageWidth={Math.max(1, pageWidth)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 12 },
  dot: { height: 8, borderRadius: 4 },
});
