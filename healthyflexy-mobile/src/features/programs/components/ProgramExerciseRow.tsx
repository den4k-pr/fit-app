import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { WeekdayPicker } from '@/features/family/components/WeekdayPicker';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { BenefitLine } from '@/shared/components/BenefitLine';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { IconButton } from '@/shared/ui/IconButton';
import type { Exercise, ProgramExerciseInput } from '@/types';

export interface ProgramExerciseRowProps {
  item: ProgramExerciseInput;
  exercise: Exercise | undefined;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleDay: (day: number) => void;
}

/** Один рядок вправи в редакторі програми: категорія, назва, дні тижня, кнопки порядку/видалення */
export function ProgramExerciseRow({ item, exercise, onMoveUp, onMoveDown, onRemove, onToggleDay }: ProgramExerciseRowProps) {
  const { t } = useTranslation();
  const icon = exercise ? CATEGORY_ICON[exercise.category] : undefined;

  return (
    <Card>
      <View style={styles.head}>
        <IconBadge icon={icon?.icon ?? 'dumbbell'} tone={icon?.tone ?? 'muted'} size={38} shape="squircle" />
        <View style={styles.name}>
          <AppText variant="bodyStrong" numberOfLines={2}>{exercise?.name ?? '…'}</AppText>
          <BenefitLine benefit={exercise?.benefit} />
        </View>
      </View>
      <AppText variant="captionStrong" color="muted" style={styles.daysLabel}>{t('programs.daysLabel')}</AppText>
      <WeekdayPicker selected={item.planDays} onToggle={onToggleDay} />
      {/* порядок і видалення — внизу: у рядку з назвою кнопки стискали її й «Користь» у вузьку колонку */}
      <View style={styles.footer}>
        <View style={styles.orderButtons}>
          <IconButton icon="chevron-up" accessibilityLabel={t('programs.moveUp')} onPress={onMoveUp} size={40} />
          <IconButton icon="chevron-down" accessibilityLabel={t('programs.moveDown')} onPress={onMoveDown} size={40} />
        </View>
        <IconButton icon="trash" accessibilityLabel={t('programs.removeExercise')} onPress={onRemove} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  name: { flex: 1 },
  orderButtons: { flexDirection: 'row', gap: 8 },
  daysLabel: { marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
});
