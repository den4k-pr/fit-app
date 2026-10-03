import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { IconName } from '@/shared/ui/Icon';
import { IconBadge, type IconTone } from '@/shared/ui/IconBadge';
import { colors } from '@/theme';

/** Де стоять «супутники» навколо головної іконки: кут (градуси) і відстань від центру (частка розміру) */
const ORBIT = [
  { angle: -40, r: 0.42, size: 0.2 },
  { angle: 200, r: 0.44, size: 0.18 },
  { angle: 95, r: 0.46, size: 0.16 },
];

function Accent({ icon, index, size }: { icon: IconName; index: number; size: number }) {
  const reduced = useReducedMotion();
  // «плавання»: кожен супутник на своїй фазі; анімуються лише зсуви (видимий із першого кадру)
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    t.set(withRepeat(withTiming(1, { duration: 2600 + index * 500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [index, reduced, t]);
  const o = ORBIT[index % ORBIT.length];
  const rad = (o.angle * Math.PI) / 180;
  const cx = size / 2 + Math.cos(rad) * size * o.r;
  const cy = size / 2 + Math.sin(rad) * size * o.r;
  const badge = Math.round(size * o.size);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (t.value - 0.5) * 10 }, { rotate: `${(t.value - 0.5) * 8}deg` }],
  }));
  return (
    <Animated.View style={[styles.accent, { left: cx - badge / 2, top: cy - badge / 2 }, style]}>
      <IconBadge icon={icon} tone={index === 0 ? 'gold' : index === 1 ? 'teal' : 'forest'} size={badge} shape="round" />
    </Animated.View>
  );
}

export interface GuideHeroProps {
  icon: IconName;
  tone: IconTone;
  accents: IconName[];
  size: number;
}

/**
 * Жива ілюстрація слайда: м'яке коло-підкладка з кільцем, що повільно обертається, велика іконка теми
 * й три «супутники», які плавають навколо — без ваги картинок і в кольорах теми.
 */
export function GuideHero({ icon, tone, accents, size }: GuideHeroProps) {
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    spin.set(withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false));
    breathe.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(spin);
      cancelAnimation(breathe);
    };
  }, [breathe, reduced, spin]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const main = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.04 }] }));
  const r = size / 2;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.blob, { width: size * 0.78, height: size * 0.78, borderRadius: size, left: size * 0.11, top: size * 0.11 }]} />
      <Animated.View style={[StyleSheet.absoluteFill, ring]}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r * 0.46} stroke={colors.greenBorder} strokeWidth={2} strokeDasharray="4 9" strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.center, main]}>
        <IconBadge icon={icon} tone={tone} size={Math.round(size * 0.36)} shape="squircle" />
      </Animated.View>
      {accents.slice(0, 3).map((a, i) => (
        <Accent key={a + i} icon={a} index={i} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', backgroundColor: colors.greenLight },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  accent: { position: 'absolute' },
});
