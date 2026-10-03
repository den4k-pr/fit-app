import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_ICON, CATEGORY_LABEL_KEY } from '@/constants/exercise-categories';
import { getExerciseIcon } from '@/constants/exercise-icons';
import { formatTarget } from '@/lib/exercise-target';
import { BenefitLine } from '@/shared/components/BenefitLine';
import { FadeView, PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors } from '@/theme';
import { ExerciseState, type TodayExercise } from '@/types';

export interface ExerciseCardProps {
  exercise: TodayExercise;
  onPress: (exercise: TodayExercise) => void;
  isLast?: boolean;
  index?: number;
}

/**
 * Рядок вправи (`.exi`). done: зелена галочка й закреслена назва; skipped: «пропущено, без оплати»;
 * current: кнопка «Старт» (порядок не важливий — доступна будь-яка невиконана вправа); locked: замок (день закрито).
 */
export function ExerciseCard({ exercise, onPress, isLast, index = 0 }: ExerciseCardProps) {
  const { t } = useTranslation();
  const skipped = exercise.state === ExerciseState.Skipped;
  const done = exercise.state === ExerciseState.Done || skipped;
  const locked = exercise.state === ExerciseState.Locked;
  const current = exercise.state === ExerciseState.Current;
  const meta = `${formatTarget(exercise, t)} · ${t(CATEGORY_LABEL_KEY[exercise.category])}`;
  return (
    <FadeView delay={140 + index * 70}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${exercise.name}, ${meta}`}
        accessibilityState={{ disabled: locked }}
        onPress={() => onPress(exercise)}
        scaleTo={0.985}
        haptic
        style={[
          styles.item,
          !isLast && styles.divider,
          current && styles.current,
          locked && styles.locked,
        ]}
      >
        <View style={styles.row}>
          {/* іконка вправи (за slug) замість постера/мініатюри */}
          <View style={done && styles.thumbDone}>
            <IconBadge
              icon={getExerciseIcon(exercise.slug) ?? CATEGORY_ICON[exercise.category].icon}
              tone={CATEGORY_ICON[exercise.category].tone}
              size={56}
              shape="squircle"
            />
          </View>
          <View style={styles.texts}>
            <AppText
              variant="bodyStrong"
              color={done ? 'muted' : 'ink'}
              style={done && styles.struck}
            >
              {exercise.name}
            </AppText>
            <AppText variant="caption" color={skipped ? 'goldDark' : 'muted'}>
              {skipped ? t('today.skippedLabel') : meta}
            </AppText>
          </View>
          {skipped ? (
            <View style={styles.lock}>
              <Icon name="skip" size={16} color="muted" />
            </View>
          ) : done ? (
            <View style={styles.check}>
              <Icon name="check" size={16} color="green" strokeWidth={3} />
            </View>
          ) : null}
          {locked ? (
            <View style={styles.lock}>
              <Icon name="lock" size={16} color="muted" />
            </View>
          ) : null}
        </View>
        {/* користь і «Старт» — окремими рядками під назвою: у рядку з кнопкою назва стискалася у вузьку колонку */}
        <View style={styles.benefit}>
          <BenefitLine benefit={exercise.benefit} muted={done} lines={current ? 3 : 2} />
          {current ? (
            <View style={styles.start}>
              <Button
                size="sm"
                icon="play"
                label={t('today.start')}
                onPress={() => onPress(exercise)}
              />
            </View>
          ) : null}
        </View>
      </PressableScale>
    </FadeView>
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefit: { paddingLeft: 70 },
  thumbDone: { opacity: 0.45 },
  start: { alignItems: 'flex-start', marginTop: 10 },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
  current: { backgroundColor: colors.shade },
  locked: { opacity: 0.6 },
  texts: { flex: 1, gap: 2 },
  struck: { textDecorationLine: 'line-through' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenLight,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.shade,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
