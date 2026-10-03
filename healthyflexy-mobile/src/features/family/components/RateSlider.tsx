import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PLAN } from '@/constants/limits';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors, radius } from '@/theme';
import type { Currency, Money } from '@/types';

export interface RateSliderProps {
  rate: Money;
  currency: Currency;
  onChange: (rate: Money) => void;
}

/** Ставка за день: великий показник у плитці зі значком монет + слайдер із кроком 0,5 (ТЗ §7.2) */
export function RateSlider({ rate, currency, onChange }: RateSliderProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <View>
      <View style={styles.tile} accessible accessibilityLabel={`${t('plan.perDay')}: ${fmt.money(rate, currency)}`}>
        <IconBadge icon="coins" tone="gold" size={46} shape="squircle" />
        <View style={styles.texts}>
          <AppText variant="h1" color="forest" style={styles.value}>{fmt.money(rate, currency)}</AppText>
          <AppText variant="caption" color="soft">{t('plan.perDay')}</AppText>
        </View>
      </View>
      <Slider
        accessibilityLabel={t('plan.rate')}
        minimumValue={PLAN.RATE_MIN}
        maximumValue={PLAN.RATE_MAX}
        step={PLAN.RATE_STEP}
        value={rate}
        onValueChange={onChange}
        minimumTrackTintColor={colors.green}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.green}
        style={styles.slider}
      />
      <View style={styles.scale}>
        <AppText variant="caption" color="muted">{t('plan.rateMin', { amount: fmt.money(PLAN.RATE_MIN, currency) })}</AppText>
        <AppText variant="captionStrong" color="green">{t('plan.rateStandard', { amount: fmt.money(PLAN.DEFAULT_RATE, currency) })}</AppText>
        <AppText variant="caption" color="muted">{t('plan.rateMax', { amount: fmt.money(PLAN.RATE_MAX, currency) })}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.tealBg,
    borderColor: colors.tealBorder,
    borderWidth: borderWidth.hairline,
    borderRadius: radius.md + 2,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  texts: { flex: 1 },
  value: { fontSize: 32, lineHeight: 38, fontVariant: ['tabular-nums'] },
  slider: { width: '100%', height: 44, marginTop: 10 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
});
