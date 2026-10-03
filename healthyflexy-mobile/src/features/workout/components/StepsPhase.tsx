import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, View } from 'react-native';
// Власна векторна анімація вимкнена на час тестування відео.
// import { ExerciseAnimation } from '@/shared/components/ExerciseAnimation';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { colors } from '@/theme';
import { say } from '@/services/voice/speech';
import type { TodayExercise } from '@/types';
import { useStepCounter } from '../hooks/useStepCounter';
import { ExerciseHero } from './ExerciseHero';

export interface StepsPhaseProps {
  exercise: TodayExercise;
  /** Крокомір дорахував до цілі */
  onReached: (steps: number) => void;
}

/** Android рахує кроки лише поки застосунок на екрані — не даємо екрану згаснути під час ходьби */
function KeepAwake() {
  useKeepAwake();
  return null;
}

/**
 * Вправа на кроки: крокомір телефона рахує з моменту старту, щойно ціль досягнута — вправа
 * автоматично відправляється на зарахування. Без крокоміра чи дозволу зарахувати не можна.
 */
export function StepsPhase({ exercise, onReached }: StepsPhaseProps) {
  const { t } = useTranslation();
  const [since] = useState(() => new Date());
  const counter = useStepCounter(since, { autoRequest: true, motionFallback: true });
  const target = exercise.targetSteps ?? 0;
  const reached = counter.status === 'ready' && counter.steps >= target;
  const sent = useRef(false);

  // голос: старт, кожна чверть шляху, фініш
  const quarter = useRef(0);
  useEffect(() => {
    if (counter.status !== 'ready' || target <= 0) return;
    if (quarter.current === 0) {
      quarter.current = 1;
      say(t('voice.steps.start', { count: target }), { interrupt: true });
      return;
    }
    const q = Math.floor((counter.steps / target) * 4);
    if (q > quarter.current && q < 4) {
      quarter.current = q;
      say(t('voice.steps.left', { count: target - counter.steps }), { interrupt: true });
    }
  }, [counter.status, counter.steps, target, t]);

  useEffect(() => {
    if (!reached || sent.current) return;
    sent.current = true;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    say(t('voice.steps.done'), { interrupt: true });
    onReached(counter.steps);
  }, [reached, counter.steps, onReached, t]);

  if (counter.status === 'checking') return <LoadingView />;

  if (counter.status !== 'ready') {
    const unavailable = counter.status === 'unavailable';
    return (
      <View style={styles.wrap}>
        <Card style={styles.gate}>
          <IconBadge icon="footprints" tone={unavailable ? 'red' : 'teal'} size={64} shape="round" />
          <AppText variant="h3" align="center">{t(unavailable ? 'steps.unavailable.title' : 'steps.permission.title')}</AppText>
          <AppText variant="small" color="soft" align="center">{t(unavailable ? 'steps.unavailable.body' : 'steps.permission.body')}</AppText>
          {counter.status === 'needs-permission' ? <Button label={t('steps.permission.allow')} icon="footprints" onPress={() => void counter.requestPermission()} /> : null}
          {counter.status === 'denied' ? <Button label={t('exercise.camera.openSettings')} icon="settings" onPress={() => void Linking.openSettings()} /> : null}
        </Card>
      </View>
    );
  }

  const left = Math.max(0, target - counter.steps);
  return (
    <View style={styles.wrap}>
      {counter.countsInBackground ? null : <KeepAwake />}
      <ExerciseHero>
        {/* <ExerciseAnimation slug={exercise.slug} size={200} /> */}
        <IconBadge icon="footprints" tone="forest" size={92} shape="round" />
      </ExerciseHero>
      <View style={styles.counter} accessible accessibilityLabel={t('steps.progressA11y', { count: counter.steps, target })}>
        <AppText variant="timer" align="center" style={styles.number}>{counter.steps}</AppText>
        <AppText variant="small" color="muted" align="center">{t('steps.ofTarget', { count: counter.steps, target })}</AppText>
      </View>
      <ProgressBar value={counter.steps} max={target} height={12} />
      <Card tone="muted" still>
        <AppText variant="bodyStrong" color="soft" align="center">
          {reached ? t('steps.reached') : t('steps.left', { count: left })}
        </AppText>
        <AppText variant="caption" color="muted" align="center" style={styles.hint}>
          {t(counter.countsInBackground ? 'steps.hintBackground' : 'steps.hintKeepOpen')}
        </AppText>
      </Card>
      {counter.hardware !== 'ready' ? (
        <Card tone="warning" still>
          <AppText variant="small" color="soft">{t('steps.motionMode')}</AppText>
          {counter.hardware === 'needs-permission' ? (
            <View style={styles.permission}>
              <Button size="sm" variant="secondary" icon="footprints" label={t('steps.permission.allow')} onPress={() => void counter.requestPermission()} />
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 12 },
  gate: { alignItems: 'center', gap: 12, marginHorizontal: 0 },
  counter: { gap: 2 },
  number: { color: colors.forest, fontVariant: ['tabular-nums'] },
  hint: { marginTop: 6 },
  permission: { marginTop: 10, alignItems: 'flex-start' },
});
