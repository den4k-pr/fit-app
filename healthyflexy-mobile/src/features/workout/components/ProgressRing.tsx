import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@/shared/ui/AppText';
import { colors } from '@/theme';

export interface ProgressRingProps {
  done: number;
  total: number;
  size?: number;
  /** dark — для темної картки «Сьогодні» */
  tone?: 'light' | 'dark';
}

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Кільце прогресу дня: дуга плавно доростає до нового значення, у центрі «2/4» і підпис */
export function ProgressRing({ done, total, size = 148, tone = 'light' }: ProgressRingProps) {
  const { t } = useTranslation();
  const fraction = total <= 0 ? 0 : Math.min(1, done / total);
  const dark = tone === 'dark';
  const arc = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(CIRCUMFERENCE * (1 - fraction), { duration: 900, easing: Easing.out(Easing.cubic) }),
  }));
  return (
    <View style={styles.wrap} accessible accessibilityLabel={t('today.ringLabel', { done, total, count: total })}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={RADIUS} fill="none" stroke={dark ? colors.line : colors.border} strokeWidth={9} />
          <AnimatedCircle
            cx={60}
            cy={60}
            r={RADIUS}
            fill="none"
            stroke={colors.green}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={arc}
            transform="rotate(-90 60 60)"
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <AppText variant="bigNumber" style={{ color: dark ? colors.mint : colors.forest }}>{`${done}/${total}`}</AppText>
          {/* підпис не ширший за внутрішнє коло: довгі слова («упражнений», «ćwiczeń») зменшуються, а не налазять на дугу */}
          <AppText
            variant="caption"
            color={dark ? 'mutedOnDark' : 'muted'}
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ maxWidth: size * 0.7 }}
          >
            {t('today.ringCaption')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
