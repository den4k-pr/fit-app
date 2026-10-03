import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SMS_COUNTRIES, type SmsCountryCode } from '@/constants/countries';
import { PressableScale } from '@/shared/motion';
import { Flag } from '@/shared/components/Flag';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors, radius } from '@/theme';

export interface CountryPickerProps {
  value: SmsCountryCode;
  onChange: (code: SmsCountryCode) => void;
}

function Tile({ code, dial, selected, onPress }: { code: SmsCountryCode; dial: string; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.tealBg : colors.shade, { duration: 180 }),
    borderColor: withTiming(selected ? colors.green : colors.border, { duration: 180 }),
  }));
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${t(`auth.country.${code}`)} ${dial}`} onPress={onPress} haptic style={styles.flex}>
      <Animated.View style={[styles.tile, box]}>
        <View style={styles.top}>
          <Flag code={code} width={34} />
          {selected ? <Icon name="check-circle" size={22} color="teal" /> : null}
        </View>
        <View>
          <AppText variant="bodyStrong" color={selected ? 'forest' : 'soft'}>{t(`auth.country.${code}`)}</AppText>
          <AppText variant="small" color="muted">{dial}</AppText>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

/** Країна номера: великі плитки з прапорцем і кодом (не випадаючий список). За замовчуванням Польща. */
export function CountryPicker({ value, onChange }: CountryPickerProps) {
  return (
    <View style={styles.row}>
      {SMS_COUNTRIES.map((country) => (
        <Tile key={country.code} code={country.code} dial={country.dial} selected={country.code === value} onPress={() => onChange(country.code)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  tile: { gap: 8, minHeight: 92, padding: 14, borderRadius: radius.md + 2, borderWidth: borderWidth.thin + 0.5 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
