import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { borderWidth, colors, radius } from '@/theme';

const QUICK = ['mom', 'dad', 'grandma', 'grandpa'] as const;

/** Швидкий вибір підпису (макет: «Мама · Тато · Бабуся · Дідусь») */
export function LabelQuickPicks({ value, onPick }: { value: string; onPick: (label: string) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {QUICK.map((key) => {
        const label = t(`parents.quick.${key}`);
        const selected = label === value;
        return (
          <PressableScale key={key} accessibilityRole="button" onPress={() => onPick(label)} haptic style={[styles.chip, selected && styles.selected]}>
            <AppText variant="smallStrong" color={selected ? 'white' : 'soft'}>{label}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.pill, borderWidth: borderWidth.medium, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8 },
  selected: { backgroundColor: colors.greenButton, borderColor: colors.greenButton },
});
