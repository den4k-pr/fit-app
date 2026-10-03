import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors } from '@/theme';

/** Умовні позначки календаря: виконано · пропущено · попереду (ті самі знаки, що й у клітинках) */
export function CalendarLegend() {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: colors.forest, borderColor: colors.forest }]}>
          <Icon name="check" size={11} color="green" />
        </View>
        <AppText variant="caption" color="muted">{t('history.legend.completed')}</AppText>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: colors.redBg, borderColor: colors.redBorder }]}>
          <Icon name="x" size={11} color="red" />
        </View>
        <AppText variant="caption" color="muted">{t('history.legend.missed')}</AppText>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: colors.surface, borderColor: colors.border }]} />
        <AppText variant="caption" color="muted">{t('history.legend.planned')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 20, height: 20, borderRadius: 6, borderWidth: borderWidth.thin, alignItems: 'center', justifyContent: 'center' },
});
