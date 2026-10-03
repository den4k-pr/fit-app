import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { borderWidth, colors, fonts, radius, typography } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'phone-pad' | 'email-address';
  autoFocus?: boolean;
  maxLength?: number;
  editable?: boolean;
  icon?: IconName;
  /** code — великі літери моноширинним шрифтом по центру (код запрошення) */
  variant?: 'default' | 'code';
  /** Поведінка клавіатури (для пошти: autoCapitalize="none", autoCorrect=false, autoComplete="email") */
  inputProps?: Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'autoComplete' | 'textContentType' | 'returnKeyType'>;
}

/** Поле вводу (`.fld`): велике, з іконкою; рамка плавно стає зеленою у фокусі, червона з іконкою при помилці */
export function TextField({ label, value, onChangeText, error, hint, placeholder, keyboardType = 'default', autoFocus, maxLength, editable = true, icon, variant = 'default', inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const box = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.red : focused ? colors.green : colors.border, { duration: 160 }),
    borderWidth: withTiming(focused || error ? 2 : borderWidth.medium, { duration: 160 }),
  }));
  return (
    <View>
      <AppText variant="caption" color="muted" style={styles.label}>{label}</AppText>
      <Animated.View style={[styles.box, !editable && styles.readonly, box]}>
        {icon ? (
          <View style={styles.icon}>
            <Icon name={icon} size={22} color={focused ? 'green' : 'muted'} />
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          editable={editable}
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, variant === 'code' && styles.code]}
          {...(variant === 'code' ? { autoCapitalize: 'characters' as const, autoCorrect: false } : null)}
        />
      </Animated.View>
      {error ? (
        <View style={styles.help}>
          <Icon name="alert-circle" size={16} color="red" />
          <AppText variant="caption" color="red" style={styles.helpText}>{error}</AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color="muted" style={styles.hintOnly}>{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  icon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 16, minHeight: 60 },
  readonly: { backgroundColor: colors.shade },
  input: { ...typography.body, color: colors.ink, flex: 1, paddingVertical: 14, outlineStyle: 'none' } as never,
  code: { textAlign: 'center', fontFamily: fonts.monoMedium, fontSize: 26, letterSpacing: 8 },
  help: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  helpText: { flex: 1 },
  hintOnly: { marginTop: 8 },
});
