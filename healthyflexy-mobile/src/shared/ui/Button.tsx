import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/shared/motion';
import { borderWidth, colors, layout, radius, shadows, type ColorToken } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary — зелена головна дія; secondary — прозора з рамкою; ghost — текстова; danger — червона */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  accessibilityHint?: string;
}

const LOOK: Record<NonNullable<ButtonProps['variant']>, { bg: string; fg: ColorToken; border?: string; base?: string; shadow?: object }> = {
  primary: { bg: colors.greenButton, fg: 'white', base: colors.greenButtonBase, shadow: shadows.button },
  secondary: { bg: 'transparent', fg: 'soft', border: colors.border },
  ghost: { bg: 'transparent', fg: 'soft' },
  danger: { bg: colors.redBg, fg: 'red', border: colors.redBorder },
};

/**
 * Кнопка-«пігулка» (`.btn` з макета): тактильна (пружинне стиснення + легка вібрація), з іконкою за потреби.
 * Головна — зелена з темнішим «об'ємним» низом (`box-shadow: 0 4px 0 var(--gd)`).
 * Висота ≥ 56 pt для основної дії (ТЗ §17: великі цілі натискання для 50+).
 */
export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, icon, iconRight, accessibilityHint }: ButtonProps) {
  const look = LOOK[variant];
  const small = size === 'sm';
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      haptic
      scaleTo={0.97}
      style={[
        small ? styles.small : styles.medium,
        !small && styles.fullWidth,
        { backgroundColor: look.bg },
        look.border ? { borderWidth: borderWidth.medium, borderColor: look.border } : null,
        look.base ? { borderBottomWidth: small ? 2 : 3, borderBottomColor: look.base } : null,
        !inactive ? look.shadow : null,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={colors[look.fg]} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={small ? 18 : 22} color={look.fg} /> : null}
            {/* підпис в один рядок: довгий («Проверить уведомление») зменшується, а не ламається на два рядки під іконкою */}
            <AppText
              variant={small ? 'buttonSmall' : 'button'}
              color={look.fg}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.label}
            >
              {label}
            </AppText>
            {iconRight ? <Icon name={iconRight} size={small ? 18 : 22} color={look.fg} /> : null}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  medium: { borderRadius: radius.pill, minHeight: layout.buttonHeight, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  small: { borderRadius: radius.pill, minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
  inactive: { opacity: 0.45 },
});
