import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { PressableScale, ScaleIn } from '@/shared/motion';
import { borderWidth, colors, radius, type ColorToken } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface StatCardProps {
  value: string;
  label: string;
  hint?: string;
  icon?: IconName;
  /** forest — лісова (`.sc-green`); gold — золотий градієнт для грошей (`.sc-gold`); shade — світла (`.sc-shade`) */
  tone?: 'forest' | 'gold' | 'shade';
  /** Натискання (напр., пояснення «що означає ця сума») — у куті з'являється значок ⓘ */
  onPress?: () => void;
}

const LOOK: Record<NonNullable<StatCardProps['tone']>, { number: ColorToken; label: ColorToken; icon: ColorToken }> = {
  forest: { number: 'mint', label: 'mutedOnDark', icon: 'mint' },
  gold: { number: 'white', label: 'white', icon: 'white' },
  shade: { number: 'forest', label: 'muted', icon: 'muted' },
};

/** Золотий градієнт плитки (`linear-gradient(135deg, #D4A017, #F0C040, #C9962B, #9C7420)`) */
function GoldBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="statGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#D4A017" />
          <Stop offset="0.4" stopColor={colors.goldBright} />
          <Stop offset="0.7" stopColor={colors.gold} />
          <Stop offset="1" stopColor={colors.goldDark} />
        </LinearGradient>
      </Defs>
      <Rect width={100} height={100} fill="url(#statGold)" />
    </Svg>
  );
}

/** Плитка статистики: велике число, підпис, іконка в куті */
export function StatCard({ value, label, hint, icon, tone = 'forest', onPress }: StatCardProps) {
  const look = LOOK[tone];
  const body = (
    <View style={[styles.tile, styles[tone], onPress && styles.tileWithInfo]} accessible={!onPress} accessibilityLabel={`${label}: ${value}`}>
      {tone === 'gold' ? <GoldBackground /> : null}
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={18} color={look.icon} />
        </View>
      ) : null}
      {/* справа — місце під значок у куті; довгі суми зменшуються, а не наїжджають на нього */}
      <AppText variant="statNumber" color={look.number} style={[styles.number, icon && styles.numberWithIcon]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </AppText>
      <AppText variant="caption" color={look.label} style={tone === 'gold' ? styles.goldLabel : null}>{label}</AppText>
      {hint ? <AppText variant="micro" color={look.label}>{hint}</AppText> : null}
      {onPress ? (
        <View style={styles.info}>
          <Icon name="info" size={14} color={look.icon} />
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} haptic style={styles.pressable}>
      {body}
    </PressableScale>
  );
}

export function StatGrid({ items }: { items: StatCardProps[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        // плитки з'являються «хвилею»
        <ScaleIn key={item.label} delay={80 + index * 60} style={styles.cell}>
          <StatCard {...item} />
        </ScaleIn>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, alignItems: 'stretch' },
  cell: { width: '50%', padding: 4 },
  tile: { flex: 1, borderRadius: radius.md, padding: 14, minHeight: 92, gap: 2, overflow: 'hidden' },
  forest: { backgroundColor: colors.forest },
  gold: { backgroundColor: colors.gold },
  shade: { backgroundColor: colors.shade, borderWidth: borderWidth.thin, borderColor: colors.border },
  icon: { position: 'absolute', top: 12, right: 12, opacity: 0.85 },
  number: { fontVariant: ['tabular-nums'] },
  numberWithIcon: { paddingRight: 22 },
  goldLabel: { opacity: 0.85 },
  info: { position: 'absolute', right: 10, bottom: 10, opacity: 0.7 },
  /** місце під значок ⓘ, щоб він не налазив на останній рядок підказки */
  tileWithInfo: { paddingBottom: 30 },
  pressable: { flex: 1 },
});
