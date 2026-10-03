import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PLAN } from '@/constants/limits';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { SelectTile } from '@/shared/ui/SelectTile';
import { ToggleRow } from '@/shared/ui/ToggleRow';
import { colors, radius } from '@/theme';
import { ALL_WORKOUT_TYPES, WorkoutType } from '@/types';
import type { PlanDraftController } from '../hooks/usePlanDraft';

const TYPE_ICON: Record<WorkoutType, IconName> = {
  [WorkoutType.Strength]: 'dumbbell',
  [WorkoutType.Cardio]: 'heart-pulse',
  [WorkoutType.Morning]: 'sun',
  [WorkoutType.Stretch]: 'stretch',
  [WorkoutType.Warmup]: 'rotate',
  [WorkoutType.Breathing]: 'wind',
  [WorkoutType.Walking]: 'footprints',
  [WorkoutType.Meditation]: 'leaf',
  [WorkoutType.Coordination]: 'target',
};

/** Рекомендація макета за тривалістю: ≤10 · ≤25 · ≤40 · більше */
const tipKey = (minutes: number) => (minutes <= 10 ? 'a' : minutes <= 25 ? 'b' : minutes <= 40 ? 'c' : 'd');

/**
 * Розділи «Плану» з макета, що визначають склад дня батька/матері (сервер добирає вправи програми під них):
 * види навантаження, час тренування (без ходьби), автоускладнення (цілі ростуть щотижня).
 */
export function PlanLoadSections({ draft, aiMode }: { draft: PlanDraftController; aiMode?: boolean }) {
  const { t } = useTranslation();
  const [confirmAuto, setConfirmAuto] = useState(false);

  return (
    <>
      <SectionLabel>{t('plan.typesSection')}</SectionLabel>
      <Card>
        <AppText variant="small" color="muted" style={styles.hint}>{t('plan.typesHint')}</AppText>
        {/* у режимі ШІ види вправ чергує сам ШІ — вибір тут діє, коли підбір ШІ вимкнено */}
        {aiMode ? (
          <View style={styles.aiNote}>
            <Icon name="sparkles" size={16} color="forest" />
            <AppText variant="caption" color="forest" style={styles.flex}>{t('plan.typesAiNote')}</AppText>
          </View>
        ) : null}
        <View style={styles.grid}>
          {ALL_WORKOUT_TYPES.map((type) => {
            const on = draft.workoutTypes.includes(type);
            return (
              <SelectTile
                key={type}
                selected={on}
                showCheck
                accessibilityLabel={t(`workoutType.${type}`)}
                onPress={() => draft.toggleWorkoutType(type)}
                style={styles.cell}
                innerStyle={styles.tile}
              >
                <Icon name={TYPE_ICON[type]} size={20} color={on ? 'forest' : 'muted'} />
                {/* одне слово — один рядок зі зменшенням (інакше Android рве слово посередині: «Stretchin / g»);
                    кілька слів — до 2 рядків по словах */}
                <AppText
                  variant="smallStrong"
                  color={on ? 'forest' : 'soft'}
                  style={styles.tileText}
                  numberOfLines={t(`workoutType.${type}`).includes(' ') ? 2 : 1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  maxFontSizeMultiplier={1.3}
                >
                  {t(`workoutType.${type}`)}
                </AppText>
              </SelectTile>
            );
          })}
        </View>
      </Card>

      <SectionLabel>{t('plan.durationSection')}</SectionLabel>
      <Card>
        <View style={styles.valueRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t('plan.durationAverage')}</AppText>
            <AppText variant="caption" color="muted">{t('plan.durationNoWalking')}</AppText>
          </View>
          <AppText variant="h1" color="forest">{t('plan.minutes', { count: draft.workoutMinutes })}</AppText>
        </View>
        <Slider
          accessibilityLabel={t('plan.durationSection')}
          minimumValue={PLAN.WORKOUT_MINUTES_MIN}
          maximumValue={PLAN.WORKOUT_MINUTES_MAX}
          step={PLAN.WORKOUT_MINUTES_STEP}
          value={draft.workoutMinutes}
          onValueChange={draft.setWorkoutMinutes}
          minimumTrackTintColor={colors.green}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.green}
          style={styles.slider}
        />
        <View style={styles.scale}>
          <AppText variant="caption" color="muted">{t('plan.minutes', { count: 5 })}</AppText>
          <AppText variant="caption" color="muted">{t('plan.minutes', { count: 30 })}</AppText>
          <AppText variant="caption" color="muted">{t('plan.minutes', { count: 60 })}</AppText>
        </View>
        <View style={styles.tip}>
          <AppText variant="captionStrong" color="forest">{t('plan.recommendation')}</AppText>
          <AppText variant="small">{t(`plan.durationTip.${tipKey(draft.workoutMinutes)}`)}</AppText>
        </View>
      </Card>

      <SectionLabel>{t('plan.autoSection')}</SectionLabel>
      <Card>
        <ToggleRow
          icon="trending-up"
          label={t('plan.autoLabel')}
          description={t('plan.autoHint')}
          value={draft.autoProgression}
          onValueChange={(on) => (on ? setConfirmAuto(true) : draft.setAutoProgression(false))}
        />
        {/* поки автоускладнення вимкнено, темп — приглушений (видно, що він ще не діє) */}
        <View style={!draft.autoProgression && styles.inactive}>
        <AppText variant="caption" color="muted" style={styles.pctLabel}>
          {t('plan.autoRate', { pct: draft.progressionPct })}
        </AppText>
        <Slider
          accessibilityLabel={t('plan.autoRate', { pct: draft.progressionPct })}
          minimumValue={PLAN.PROGRESSION_PCT_MIN}
          maximumValue={PLAN.PROGRESSION_PCT_MAX}
          step={1}
          value={draft.progressionPct}
          onValueChange={draft.setProgressionPct}
          minimumTrackTintColor={draft.autoProgression ? colors.green : colors.muted}
          maximumTrackTintColor={colors.border}
          thumbTintColor={draft.autoProgression ? colors.green : colors.muted}
          style={styles.slider}
        />
        </View>
      </Card>

      {/* макет: «Потребує підтвердження» — увімкнення підтверджується окремо */}
      <ConfirmDialog
        visible={confirmAuto}
        title={t('plan.autoConfirmTitle')}
        message={t('plan.autoConfirmBody', { pct: draft.progressionPct })}
        confirmLabel={t('plan.autoConfirmYes')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          draft.setAutoProgression(true);
          setConfirmAuto(false);
        }}
        onCancel={() => setConfirmAuto(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '50%', padding: 4 },
  /** справа — місце під галочку обраної плитки (вона накладається в куті) */
  // праворуч — місце під галочку в куті (довгі підписи не налазять на неї)
  tile: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, paddingLeft: 12, paddingRight: 30 },
  tileText: { flex: 1 },
  flex: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slider: { width: '100%', height: 44, marginTop: 6 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  tip: { backgroundColor: colors.greenLight, borderColor: colors.greenBorder, borderWidth: 1, borderRadius: radius.sm, padding: 12, gap: 4, marginTop: 12 },
  pctLabel: { marginTop: 14 },
  aiNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.greenLight, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  inactive: { opacity: 0.55 },
});
