import { StyleSheet, View } from 'react-native';
import { borderWidth, colors, radius, type ColorToken } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface BadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'muted';
  size?: 'md' | 'sm';
  icon?: IconName;
}

const TONES: Record<NonNullable<BadgeProps['tone']>, { bg: string; text: string; token: ColorToken; border: string }> = {
  success: { bg: colors.greenLight, text: colors.pillGreenText, token: 'pillGreenText', border: colors.greenBorder },
  warning: { bg: colors.pillGoldBg, text: colors.pillGoldText, token: 'pillGoldText', border: colors.pillGoldBorder },
  error: { bg: colors.redBg, text: colors.red, token: 'red', border: colors.redBorder },
  muted: { bg: colors.shade, text: colors.soft, token: 'soft', border: colors.border },
};

/** Пігулка-статус з необов'язковою іконкою */
export function Badge({ label, tone = 'success', size = 'md', icon }: BadgeProps) {
  const c = TONES[tone];
  const small = size === 'sm';
  return (
    <View style={[styles.pill, small ? styles.small : styles.medium, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon ? <Icon name={icon} size={small ? 12 : 15} color={c.token} strokeWidth={2.4} /> : null}
      <AppText variant={small ? 'micro' : 'captionStrong'} style={[styles.label, { color: c.text }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, borderWidth: borderWidth.thin, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, maxWidth: '100%' },
  label: { flexShrink: 1 },
  medium: { paddingHorizontal: 12, paddingVertical: 6 },
  small: { paddingHorizontal: 10, paddingVertical: 4 },
});
