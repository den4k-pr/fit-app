import { StyleSheet, View } from 'react-native';
import { colors, type ColorToken } from '@/theme';
import { Icon, type IconName } from './Icon';

export type IconTone = 'gold' | 'teal' | 'red' | 'forest' | 'muted' | 'strength' | 'cardio' | 'balance' | 'breathing' | 'jointMobility' | 'stretch';

const TONES: Record<IconTone, { bg: string; fg: ColorToken; ring?: string }> = {
  gold: { bg: colors.pillGoldBg, fg: 'goldDark', ring: colors.pillGoldBorder },
  teal: { bg: colors.greenLight, fg: 'greenDark', ring: colors.greenBorder },
  red: { bg: colors.redBg, fg: 'red', ring: colors.redBorder },
  forest: { bg: colors.forest, fg: 'mint' },
  muted: { bg: colors.shade, fg: 'muted', ring: colors.border },
  strength: { bg: colors.categoryStrength, fg: 'greenDark' },
  cardio: { bg: colors.categoryCardio, fg: 'red' },
  balance: { bg: colors.categoryBalance, fg: 'soft' },
  breathing: { bg: colors.categoryBreathing, fg: 'soft' },
  jointMobility: { bg: colors.categoryJointMobility, fg: 'gold' },
  stretch: { bg: colors.categoryStretch, fg: 'greenDark' },
};

export interface IconBadgeProps {
  icon: IconName;
  tone?: IconTone;
  size?: number;
  /** round — коло, squircle — м'який квадрат (для списків) */
  shape?: 'round' | 'squircle';
}

/** Іконка в кольоровій «плашці»: заміна емодзі-маркерів у рядках, картках, заголовках */
export function IconBadge({ icon, tone = 'gold', size = 44, shape = 'squircle' }: IconBadgeProps) {
  const t = TONES[tone];
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: shape === 'round' ? size / 2 : Math.round(size * 0.26), backgroundColor: t.bg },
        t.ring ? { borderWidth: 1, borderColor: t.ring } : null,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={t.fg} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
