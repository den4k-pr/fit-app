import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { colors } from '@/theme';

export interface AuthStepsProps {
  current: number;
  total?: number;
}

function Segment({ filled }: { filled: boolean }) {
  const fill = useAnimatedStyle(() => ({ width: `${withTiming(filled ? 100 : 0, { duration: 500, easing: Easing.out(Easing.cubic) })}%` }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

/** «Крок 2 з 5» і смужки, що плавно заповнюються: людина завжди бачить, скільки ще залишилось (ТЗ §5.4) */
export function AuthSteps({ current, total = 5 }: AuthStepsProps) {
  const { t } = useTranslation();
  return (
    <Reveal>
      <View style={styles.wrap} accessible accessibilityLabel={t('auth.step', { current, total })}>
        <AppText variant="smallStrong" color="muted">{t('auth.step', { current, total })}</AppText>
        <View style={styles.bars}>
          {Array.from({ length: total }, (_, i) => (
            <Segment key={i} filled={i < current} />
          ))}
        </View>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.green, borderRadius: 3 },
});
