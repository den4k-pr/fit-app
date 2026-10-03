import { StyleSheet, View } from 'react-native';
import { CURRENCIES, CURRENCY_SYMBOL } from '@/constants/currencies';
import { AppText } from '@/shared/ui/AppText';
import { SelectTile } from '@/shared/ui/SelectTile';
import type { Currency } from '@/types';

export interface CurrencyToggleProps {
  value: Currency;
  onChange: (currency: Currency) => void;
}

/** EUR / PLN: дві плитки; обрана підсвічується. Це лише мітка для обліку, конвертації немає (ТЗ §7.2). */
export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <View style={styles.row}>
      {CURRENCIES.map((currency) => {
        const selected = currency === value;
        return (
          <SelectTile key={currency} selected={selected} showCheck accessibilityLabel={currency} onPress={() => onChange(currency)} style={styles.flex} innerStyle={styles.tile}>
            <AppText variant="h2" color={selected ? 'forest' : 'soft'}>{CURRENCY_SYMBOL[currency]}</AppText>
            <AppText variant="caption" color={selected ? 'soft' : 'muted'}>{currency}</AppText>
          </SelectTile>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  tile: { minHeight: 64, gap: 0 },
});
