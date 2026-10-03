import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PARENT_AVATAR, RELATIONSHIPS } from '@/constants/relationships';
import { AppText } from '@/shared/ui/AppText';
import { Emoji } from '@/shared/ui/Emoji';
import { SelectTile } from '@/shared/ui/SelectTile';
import type { RelationshipType } from '@/types';

export interface RelationshipPickerProps {
  value: RelationshipType;
  onChange: (value: RelationshipType) => void;
}

/** «Хто це для вас?»: мама / тато / бабуся / дідусь / інше. Емодзі тут доречні: це члени сім'ї. */
export function RelationshipPicker({ value, onChange }: RelationshipPickerProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {RELATIONSHIPS.map((item) => {
        const selected = item === value;
        return (
          <SelectTile key={item} selected={selected} accessibilityLabel={t(`relationship.${item}`)} onPress={() => onChange(item)} innerStyle={styles.chip}>
            <Emoji symbol={PARENT_AVATAR[item]} size={18} />
            <AppText variant="smallStrong" color={selected ? 'forest' : 'soft'}>{t(`relationship.${item}`)}</AppText>
          </SelectTile>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', gap: 8, minHeight: 46, paddingHorizontal: 14, borderRadius: 24 },
});
