import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { FadeView } from '@/shared/motion';
import { colors } from '@/theme';
import { AppText } from './AppText';

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 360 })), -1));
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * v.value }, { scale: 1 + 0.25 * v.value }], opacity: 0.55 + 0.45 * v.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Три зелені точки, що «дихають». З'являється з невеликою затримкою: швидкі відповіді не мигають. */
export function LoadingView({ message }: { message?: string }) {
  return (
    <FadeView delay={200} style={styles.wrap}>
      <View style={styles.dots}>{[0, 140, 280].map((d) => <Dot key={d} delay={d} />)}</View>
      {message ? <AppText variant="small" color="muted">{message}</AppText> : null}
    </FadeView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, minHeight: 240 },
  dots: { flexDirection: 'row', gap: 8, height: 30, alignItems: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
});
