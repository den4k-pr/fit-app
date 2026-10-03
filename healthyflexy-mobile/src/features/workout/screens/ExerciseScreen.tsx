import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useSettingsStore } from '@/store/settings.store';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { stopSpeaking } from '@/services/voice/speech';
import { ExerciseState, type Today, type TodayExercise } from '@/types';
import { AiRejectedPhase } from '../components/AiRejectedPhase';
import { DemoPhase } from '../components/DemoPhase';
import { DonePhase } from '../components/DonePhase';
import { CapturePhase } from '../components/CapturePhase';
import { StepsPhase } from '../components/StepsPhase';
import { UploadPhase } from '../components/UploadPhase';
import { useExerciseFlow } from '../hooks/useExerciseFlow';
import { useSkipExercise } from '../hooks/useSkipExercise';
import { useToday } from '../hooks/useToday';

/** Екран вправи: демо → камера (6 кадрів + AI) або крокомір → результат. Стан: exercise-flow.store. */
export function ExerciseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const today = useToday();

  if (today.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (today.isError || !today.data) return <Screen scroll={false}><ErrorState error={today.error} onRetry={() => void today.refetch()} /></Screen>;

  const exercise = today.data.exercises.find((e) => e.exerciseId === exerciseId);
  const session = today.data.session;
  if (!exercise || !session) {
    return (
      <Screen bottomInset>
        <ScreenHeader title={t('exercise.unavailable.title')} onBack={() => router.back()} backLabel={t('common.back')} />
        <EmptyState title={t('exercise.unavailable.body')} action={<Button label={t('common.back')} onPress={() => router.back()} />} />
      </Screen>
    );
  }
  return <ExerciseFlow exercise={exercise} sessionId={session.id} today={today.data} />;
}

interface ExerciseFlowProps {
  exercise: TodayExercise;
  sessionId: string;
  today: Today;
}

function ExerciseFlow({ exercise, sessionId, today }: ExerciseFlowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const flow = useExerciseFlow(exercise, sessionId);
  const skip = useSkipExercise();
  const [confirmSkip, setConfirmSkip] = useState(false);
  // макет: перед ПЕРШОЮ вправою — медичне попередження (один раз на пристрої)
  const warningAccepted = useSettingsStore((s) => s.medicalWarningAccepted);
  const voiceOn = useSettingsStore((s) => s.voiceEnabled);
  const toggleVoice = () => {
    useSettingsStore.getState().setVoiceEnabled(!voiceOn);
    if (voiceOn) stopSpeaking();
  };

  const position = today.exercises.findIndex((e) => e.exerciseId === exercise.exerciseId) + 1;
  const blocked = flow.phase === 'demo' && exercise.state !== ExerciseState.Current;

  // макет: після кожної зарахованої вправи — екран винагороди «+€1.25»
  const finish = () => router.replace(ROUTES.reward);

  return (
    <Screen bottomInset>
      <ScreenHeader title={exercise.name} subtitle={flow.phase === 'demo' ? t('exercise.stepOf', { current: position, total: today.exercises.length }) : undefined} onBack={() => router.back()}
        backLabel={t('common.back')}
        right={
          <IconButton
            icon={voiceOn ? 'volume' : 'volume-off'}
            accessibilityLabel={t(voiceOn ? 'exercise.voiceOff' : 'exercise.voiceOn')}
            onPress={toggleVoice}
          />
        }
      />

      {blocked ? (
        <EmptyState
          title={t('exercise.unavailable.body')}
          action={<Button label={t('common.back')} onPress={() => router.back()} />}
        />
      ) : null}
      {!blocked && flow.phase === 'demo' && warningAccepted ? <DemoPhase exercise={exercise} onStart={flow.start} /> : null}
      <ConfirmDialog
        visible={!blocked && flow.phase === 'demo' && !warningAccepted}
        title={t('exercise.medical.title')}
        message={t('exercise.medical.body')}
        confirmLabel={t('exercise.medical.confirm')}
        cancelLabel={t('common.back')}
        onConfirm={() => useSettingsStore.getState().acceptMedicalWarning()}
        onCancel={() => router.back()}
      />
      {flow.phase === 'capturing' ? (
        <CapturePhase exercise={exercise} onCaptured={flow.onCaptured} />
      ) : null}
      {flow.phase === 'stepping' ? <StepsPhase exercise={exercise} onReached={flow.onStepsReached} /> : null}
      {flow.phase === 'uploading' || flow.phase === 'error' ? (
        <UploadPhase
          progress={flow.uploadProgress}
          errorCode={flow.phase === 'error' ? flow.errorCode ?? 'UNKNOWN' : null}
          onRetry={flow.retry}
          stepsMode={flow.isStepsExercise}
        />
      ) : null}
      {/* спроби AI-перевірки цієї вправи на сьогодні вичерпано — пропонуємо пропустити її й іти далі */}
      {flow.phase === 'error' && flow.errorCode === 'AI_ATTEMPTS_LIMIT' ? (
        <View style={styles.skip}>
          <Button variant="secondary" icon="skip" label={t('exercise.skip.button')} loading={skip.isPending} onPress={() => setConfirmSkip(true)} />
        </View>
      ) : null}
      {flow.phase === 'ai-rejected' && flow.lastAttempt ? (
        <AiRejectedPhase attempt={flow.lastAttempt} onRetry={flow.retryCapture} onSkip={() => setConfirmSkip(true)} skipping={skip.isPending} />
      ) : null}
      <ConfirmDialog
        visible={confirmSkip}
        title={t('exercise.skip.confirmTitle')}
        message={t('exercise.skip.confirmBody')}
        confirmLabel={t('exercise.skip.confirmYes')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmSkip(false);
          skip.mutate({ sessionId, exerciseId: exercise.exerciseId }, { onSuccess: () => router.back() });
        }}
        onCancel={() => setConfirmSkip(false)}
      />
      {flow.phase === 'done' && flow.result ? (
        <DonePhase result={flow.result} currency={today.currency} onContinue={finish} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skip: { paddingHorizontal: 16, marginTop: 8 },
});
