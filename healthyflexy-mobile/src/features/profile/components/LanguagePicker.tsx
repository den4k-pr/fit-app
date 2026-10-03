import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { LANGUAGES_DISPLAY_ORDER, LANGUAGE_LABEL } from '@/constants/languages';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { SelectTile } from '@/shared/ui/SelectTile';
import { useLanguageSwitch } from '../hooks/useLanguageSwitch';

/** Мова інтерфейсу (назви рідною мовою), сітка 2×2: українська й русский — по діагоналі, далеко одна від одної */
export function LanguagePicker() {
  const { t } = useTranslation();
  const { language, change } = useLanguageSwitch();
  return (
    <View>
      <View style={styles.head}>
        <Icon name="globe" size={16} color="muted" />
        <AppText variant="captionStrong" color="muted">{t('profile.language')}</AppText>
      </View>
      <View style={styles.grid}>
        {LANGUAGES_DISPLAY_ORDER.map((item) => {
          const selected = item === language;
          return (
            <SelectTile key={item} selected={selected} showCheck accessibilityLabel={LANGUAGE_LABEL[item]} onPress={() => void change(item)} style={styles.cell} innerStyle={styles.tile}>
              <AppText variant="smallStrong" color={selected ? 'forest' : 'soft'}>{LANGUAGE_LABEL[item]}</AppText>
            </SelectTile>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%' },
  tile: { minHeight: 50 },
});
