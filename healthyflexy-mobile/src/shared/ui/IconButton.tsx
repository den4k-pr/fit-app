import { StyleSheet } from 'react-native';
import { PressableScale } from '@/shared/motion';
import { borderWidth, colors } from '@/theme';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  tone?: 'soft' | 'dark';
}

/** Кругла кнопка з іконкою (назад, закрити…) із зоною натискання ≥ 48 pt */
export function IconButton({ icon, onPress, accessibilityLabel, size = 44, tone = 'soft' }: IconButtonProps) {
  const dark = tone === 'dark';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={Math.max(0, (48 - size) / 2)}
      onPress={onPress}
      haptic
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }, dark ? styles.dark : styles.soft]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={dark ? 'mint' : 'forest'} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  soft: { backgroundColor: colors.shade, borderWidth: borderWidth.thin, borderColor: colors.border },
  dark: { backgroundColor: colors.forest },
});
