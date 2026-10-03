import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors, layout, radius, shadows } from '@/theme';

export interface RoleCardProps {
  /** Емодзі-аватар ролі (батько/мати чи дитина: тут емодзі доречні) */
  avatar: string;
  title: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
}

/** Велика картка вибору ролі: аватар, назва, підказка; обрана — золота рамка та галочка, що «виростає» */
export function RoleCard({ avatar, title, description, selected, onPress }: RoleCardProps) {
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.greenLight : colors.surface, { duration: 200 }),
    borderColor: withTiming(selected ? colors.green : colors.border, { duration: 200 }),
    borderWidth: withTiming(selected ? 2 : borderWidth.thin, { duration: 200 }),
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0, { duration: 140 }),
    transform: [{ scale: withSpring(selected ? 1 : 0.4, { damping: 11, stiffness: 260 }) }],
  }));
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ selected: !!selected }} onPress={onPress} haptic scaleTo={0.98} style={styles.outer}>
      <Animated.View style={[styles.card, shadows.card, box]}>
        <Avatar symbol={avatar} size={64} tone={selected ? 'dark' : 'paper'} />
        <View style={styles.texts}>
          <AppText variant="h2">{title}</AppText>
          <AppText variant="small" color="muted">{description}</AppText>
        </View>
        <View style={styles.radio}>
          <Animated.View style={[styles.check, mark]}>
            <Icon name="check" size={16} color="white" strokeWidth={3} />
          </Animated.View>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  outer: { marginHorizontal: layout.screenPadding, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: radius.lg, padding: 18, minHeight: 104 },
  texts: { flex: 1, gap: 4 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: borderWidth.medium, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenButton, alignItems: 'center', justifyContent: 'center', position: 'absolute' },
});
