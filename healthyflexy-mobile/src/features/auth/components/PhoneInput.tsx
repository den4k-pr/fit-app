import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Icon } from '@/shared/ui/Icon';
import { SMS_COUNTRIES, type SmsCountryCode } from '@/constants/countries';
import { AppText } from '@/shared/ui/AppText';
import { borderWidth, colors, radius, typography } from '@/theme';

export interface PhoneInputProps {
  country: SmsCountryCode;
  /** Лише цифри національного номера (без коду країни) */
  digits: string;
  onChange: (digits: string) => void;
  error?: string;
  autoFocus?: boolean;
}

const dialOf = (country: SmsCountryCode) => SMS_COUNTRIES.find((c) => c.code === country)?.dial ?? '';

/** «501234567» → «501 234 567» (форматування на льоту) */
export const formatNational = (country: SmsCountryCode, digits: string): string =>
  new AsYouType(country as CountryCode).input(digits);

/** Цифри + країна → E.164 (`+48501234567`) або null. Нуль на початку (050…) допускається. */
export function toE164(country: SmsCountryCode, digits: string): string | null {
  const parsed = parsePhoneNumberFromString(digits, country as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}

/** Код країни фіксований зліва, людина вводить лише свої цифри: неможливо помилитись із «+» і кодом */
export function PhoneInput({ country, digits, onChange, error, autoFocus }: PhoneInputProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const box = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.red : focused ? colors.green : colors.border, { duration: 160 }),
    borderWidth: withTiming(focused || error ? 2 : borderWidth.thin, { duration: 160 }),
  }));
  return (
    <View>
      <AppText variant="bodyMedium" color="soft" style={styles.label}>{t('auth.phone.numberLabel')}</AppText>
      <Animated.View style={[styles.field, box]}>
        <AppText variant="h3" color="forest" style={styles.dial}>{dialOf(country)}</AppText>
        <TextInput
          accessibilityLabel={t('auth.phone.numberLabel')}
          value={formatNational(country, digits)}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 12))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder={country === 'PL' ? '501 234 567' : '50 123 45 67'}
          placeholderTextColor={colors.muted}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" size={16} color="red" />
          <AppText variant="small" color="red" style={styles.errorText}>{error}</AppText>
        </View>
      ) : (
        <AppText variant="small" color="muted" style={styles.help}>{t('auth.phone.hint')}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.md + 2,
    paddingHorizontal: 16,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  errorText: { flex: 1 },
  dial: { paddingRight: 10, borderRightWidth: borderWidth.thin, borderRightColor: colors.border },
  input: { ...typography.h3, flex: 1, minWidth: 0, color: colors.ink, minHeight: 56, paddingVertical: 8, outlineStyle: 'none' } as never,
  help: { marginTop: 8 },
});
