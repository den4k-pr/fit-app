import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PopIn } from '@/shared/motion';
import { OTP } from '@/constants/limits';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors, radius, shadows, typography } from '@/theme';

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Викликається, коли введено всі цифри */
  onComplete: (code: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
}

function Cell({ char, active, error }: { char: string; active: boolean; error: boolean }) {
  const box = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.red : active ? colors.green : char ? colors.greenBorder : colors.border, { duration: 140 }),
    borderWidth: withTiming(active || error ? 2 : borderWidth.thin, { duration: 140 }),
  }));
  return (
    <Animated.View style={[styles.cell, active && shadows.card, box]}>
      {char ? (
        <PopIn key={char}>
          <AppText variant="h1" color="forest" align="center">{char}</AppText>
        </PopIn>
      ) : null}
    </Animated.View>
  );
}

/** 6 клітинок для коду. Одне справжнє поле під ними: працює автопідстановка SMS (iOS oneTimeCode / Android sms-otp). */
export function OtpInput({ value, onChange, onComplete, length = OTP.LENGTH, error, autoFocus }: OtpInputProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(!!autoFocus);
  const handle = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete(digits);
  };
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="OTP" onPress={() => input.current?.focus()} style={styles.row}>
        {Array.from({ length }, (_, i) => (
          <Cell key={i} char={value[i] ?? ''} active={focused && i === Math.min(value.length, length - 1)} error={!!error} />
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={value}
        onChangeText={handle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hidden}
      />
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" size={16} color="red" />
          <AppText variant="caption" color="red" style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cell: { flex: 1, height: 64, borderRadius: radius.md + 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hidden: { ...typography.body, position: 'absolute', opacity: 0.02, height: 1, width: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  errorText: { flex: 1 },
});
