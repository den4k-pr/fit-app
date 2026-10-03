import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { AppText } from '@/shared/ui/AppText';
import type { IllustrationProps } from '@/shared/illustrations';

export interface OnboardingSlideProps {
  Illustration: ComponentType<IllustrationProps>;
  title: string;
  body: string;
  index: number;
  width: number;
  height: number;
  /** Позиція гортання в пікселях: за нею малюємо паралакс і зникання */
  scrollX: SharedValue<number>;
}

/** Слайд: ілюстрація й текст плавно виїжджають/зникають разом із гортанням (паралакс) */
export function OnboardingSlide({ Illustration, title, body, index, width, height, scrollX }: OnboardingSlideProps) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const art = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.25, 0, -width * 0.25], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, range, [0.8, 1, 0.8], Extrapolation.CLAMP) },
    ],
  }));
  const text = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(scrollX.value, range, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP) }],
  }));
  return (
    <View style={[styles.slide, { width, height }]}>
      <Animated.View style={art}>
        <Illustration size={Math.min(300, width - 48)} />
      </Animated.View>
      <Animated.View style={[styles.texts, text]}>
        <AppText variant="h1" align="center" color="forest">{title}</AppText>
        <AppText variant="body" align="center" color="soft">{body}</AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 },
  texts: { gap: 12, alignItems: 'center' },
});
