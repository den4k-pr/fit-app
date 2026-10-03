import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { formatTarget } from '@/lib/exercise-target';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors } from '@/theme';
import type { Exercise } from '@/types';
import { ExerciseThumb } from './ExerciseThumb';

export interface ExerciseCatalogRowProps {
  exercise: Exercise;
  checked: boolean;
  /** Режим ШІ: відмітки не діють (приглушені), але зберігаються */
  dimmed?: boolean;
  onOpen: (exercise: Exercise) => void;
  onToggle: (exercise: Exercise) => void;
  last?: boolean;
}

/**
 * Рядок каталогу: мініатюра з рухом, назва, ціль і користь; тап по рядку — екран опису вправи з відео,
 * окреме віконце праворуч — галочка «включити в щоденні вправи».
 */
export function ExerciseCatalogRow({ exercise, checked, dimmed, onOpen, onToggle, last }: ExerciseCatalogRowProps) {
  const { t } = useTranslation();
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(checked ? colors.green : colors.surface, { duration: 160 }),
    borderColor: withTiming(checked ? colors.green : colors.border, { duration: 160 }),
  }));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      onPress={() => onOpen(exercise)}
      scaleTo={0.985}
      style={[styles.row, !last && styles.divider]}
    >
      <ExerciseThumb slug={exercise.slug} category={exercise.category} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={2}>{exercise.name}</AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {`${formatTarget(exercise, t)} · ${t('plan.minutes', { count: exercise.info.durationMin })}`}
        </AppText>
        <AppText variant="caption" color="soft" numberOfLines={2}>{exercise.benefit}</AppText>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('catalog.include', { name: exercise.name })}
        accessibilityState={{ checked }}
        hitSlop={12}
        onPress={() => onToggle(exercise)}
        style={[styles.checkWrap, dimmed && styles.dimmed]}
      >
        <Animated.View style={[styles.check, box]}>
          {checked ? <Icon name="check" size={18} color="white" strokeWidth={3} /> : null}
        </Animated.View>
      </Pressable>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
  texts: { flex: 1, gap: 2 },
  checkWrap: { padding: 4 },
  check: { width: 30, height: 30, borderRadius: 8, borderWidth: borderWidth.medium, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.45 },
});
