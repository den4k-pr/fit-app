import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { EXERCISE_VIDEO_RATIO, getExerciseVideo } from '@/constants/exercise-videos';
import { formatTarget } from '@/lib/exercise-target';
import { DemoVideoPlayer } from '@/shared/components/DemoVideoPlayer';
// Власна векторна анімація вимкнена на час тестування відео — демо показує лише відео.
// import { ExerciseAnimation, hasExerciseAnimation } from '@/shared/components/ExerciseAnimation';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { colors, radius } from '@/theme';
import { stopSpeaking } from '@/services/voice/speech';
import type { TodayExercise } from '@/types';
import { BenefitBlock } from './BenefitBlock';
import { ExerciseHero } from './ExerciseHero';
import { TechniqueBlock } from './TechniqueBlock';

export interface DemoPhaseProps {
  exercise: TodayExercise;
  onStart: () => void;
}

/** Макет: 20 с «Дивіться й повторюйте»; пропустити можна після 10 с; на нулі вправа стартує сама */
const WATCH_SECONDS = 20;
const SKIP_AFTER_SECONDS = 10;

function useWatchCountdown(onDone: () => void): number {
  const [left, setLeft] = useState(WATCH_SECONDS);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (left === 0) done.current();
  }, [left]);
  return left;
}

function WatchTimer({ left }: { left: number }) {
  return (
    <>
      <View style={styles.timerPill}>
        <AppText variant="mono" style={styles.timerText}>{left}</AppText>
      </View>
      <View style={styles.watchTrack}>
        <View style={[styles.watchFill, { width: `${(left / WATCH_SECONDS) * 100}%` }]} />
      </View>
    </>
  );
}

/** Фаза 1 (ТЗ §6.3): демонстрація техніки (відео або векторна анімація), «користь», ціль вправи, кнопка «Почати вправу» */
export function DemoPhase({ exercise, onStart }: DemoPhaseProps) {
  const { t } = useTranslation();
  const cat = CATEGORY_ICON[exercise.category];
  const left = useWatchCountdown(onStart);
  const canSkip = WATCH_SECONDS - left >= SKIP_AFTER_SECONDS;

  // озвучку демонстрації поки вимкнено: лише обриваємо фразу, що могла лишитися з попереднього екрана
  useEffect(() => {
    stopSpeaking();
  }, []);

  const video = getExerciseVideo(exercise.slug);
  // Власна анімація (вимкнена, щоб демо показувало лише відео). Щоб повернути — розкоментувати імпорт
  // і вставити цю гілку перед іконкою категорії:
  // ) : hasExerciseAnimation(exercise.slug) ? (
  //   <ExerciseHero padded={false}>
  //     <View style={styles.animation}>
  //       <ExerciseAnimation slug={exercise.slug} size={240} />
  //       <AppText variant="micro" align="center" style={styles.kicker}>{t('exercise.watchAndRepeat').toUpperCase()}</AppText>
  //     </View>
  //     <WatchTimer left={left} />
  //   </ExerciseHero>
  return (
    <View style={styles.wrap}>
      <Reveal>
        {video ? (
          <ExerciseHero padded={false}>
            <DemoVideoPlayer source={video} ratio={EXERCISE_VIDEO_RATIO} maxHeight={440} />
            <WatchTimer left={left} />
          </ExerciseHero>
        ) : exercise.demoVideoUrl ? (
          <ExerciseHero padded={false}>
            <DemoVideoPlayer source={exercise.demoVideoUrl} />
            <WatchTimer left={left} />
          </ExerciseHero>
        ) : (
          // власна анімація вимкнена: вправи без відео показують іконку категорії
          <ExerciseHero>
            <IconBadge icon={cat.icon} tone="forest" size={92} shape="round" />
            <AppText variant="small" align="center" style={styles.caption}>{t('exercise.demoCaption')}</AppText>
            <WatchTimer left={left} />
          </ExerciseHero>
        )}
      </Reveal>
      <Reveal>
        <View style={styles.target}>
          <View style={styles.targetIcon}>
            <Icon name="target" size={22} color="greenDark" />
          </View>
          <View style={styles.targetTexts}>
            <AppText variant="caption" color="muted">{t('exercise.target')}</AppText>
            <AppText variant="h1" style={styles.targetValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatTarget(exercise, t)}
            </AppText>
          </View>
        </View>
      </Reveal>
      {exercise.description ? (
        <Reveal>
          <TechniqueBlock description={exercise.description} />
        </Reveal>
      ) : null}
      <Reveal>
        <BenefitBlock benefit={exercise.benefit} sourceTitle={exercise.sourceTitle} sourceUrl={exercise.sourceUrl} />
      </Reveal>
      {exercise.safetyInstructions ? (
        <Reveal>
          <View style={styles.safety}>
            <IconBadge icon="shield" tone="gold" size={40} />
            <View style={styles.safetyTexts}>
              <AppText variant="captionStrong" style={styles.safetyHead}>{t('exercise.safety')}</AppText>
              <AppText variant="small">{exercise.safetyInstructions}</AppText>
            </View>
          </View>
        </Reveal>
      ) : null}
      <Reveal>
        <View style={styles.button}>
          <Button
            label={canSkip ? t(exercise.targetSteps !== null ? 'steps.start' : 'exercise.startExercise') : t('exercise.watchFirst', { seconds: left - (WATCH_SECONDS - SKIP_AFTER_SECONDS) })}
            icon={exercise.targetSteps !== null ? 'footprints' : 'camera'}
            disabled={!canSkip}
            onPress={onStart}
          />
        </View>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 14 },
  caption: { color: colors.mint },
  animation: { paddingVertical: 12, alignItems: 'center' },
  kicker: { color: colors.mint, letterSpacing: 1, marginTop: 4 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  targetIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  targetValue: { color: colors.forest },
  targetTexts: { flex: 1 },
  safety: { flexDirection: 'row', gap: 12, backgroundColor: colors.pillGoldBg, borderColor: colors.pillGoldBorder, borderWidth: 1, borderRadius: radius.lg, padding: 14, alignItems: 'flex-start' },
  safetyTexts: { flex: 1, gap: 4 },
  safetyHead: { color: colors.pillGoldText },
  button: { marginTop: 4 },
  timerPill: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.greenButton, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 3 },
  timerText: { color: colors.white, fontSize: 15 },
  watchTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  watchFill: { height: '100%', backgroundColor: colors.green },
});
