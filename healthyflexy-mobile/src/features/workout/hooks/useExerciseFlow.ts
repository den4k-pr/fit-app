import { useCallback, useEffect } from 'react';
import { toApiError, type ClientErrorCode } from '@/api/errors';
import { PHOTO } from '@/constants/limits';
import { useExerciseFlowStore, type ExercisePhase } from '@/store/exercise-flow.store';
import { ErrorCode, type AcceptedCompletion, type AttemptResult, type TodayExercise } from '@/types';
import { useCompleteExercise, type CompleteExerciseInput } from './useCompleteExercise';

export interface ExerciseFlowController {
  phase: ExercisePhase;
  photoUris: string[];
  uploadProgress: number;
  errorCode: ClientErrorCode | null;
  /** Результат complete (для екрана «Вправу зараховано» / «День виконано») */
  result: AcceptedCompletion | null;
  /** Результат AI-аналізу відхиленої спроби (фаза 'ai-rejected') */
  lastAttempt: AttemptResult | null;
  /** Вправа на кроки (крокомір) замість камери */
  isStepsExercise: boolean;
  /** Фаза 1 → 2: «Почати вправу» (камера або крокомір) */
  start: () => void;
  /** Камера зробила кадри → одразу відправляємо (замало кадрів — просимо пересняти) */
  onCaptured: (uris: string[], frameTimes: number[]) => void;
  /** Крокомір дорахував до цілі → відправляємо кількість кроків */
  onStepsReached: (steps: number) => void;
  /** «Спробувати ще раз» після помилки: мережа — ті самі дані; замало кадрів/кроків — назад до вправи */
  retry: () => void;
  /** «Спробувати ще раз» після відхилення AI — назад до камери, старі кадри скинуто */
  retryCapture: () => void;
}

/**
 * Оркестратор екрана вправи: demo → capturing|stepping → uploading → done | error | ai-rejected.
 * Стан живе в `exercise-flow.store`; тут — переходи та виклики API (кадри + зарахування одним запитом).
 */
export function useExerciseFlow(exercise: TodayExercise, sessionId: string): ExerciseFlowController {
  const phase = useExerciseFlowStore((s) => s.phase);
  const photoUris = useExerciseFlowStore((s) => s.photoUris);
  const uploadProgress = useExerciseFlowStore((s) => s.uploadProgress);
  const errorCode = useExerciseFlowStore((s) => s.errorCode);
  const result = useExerciseFlowStore((s) => s.lastResult);
  const lastAttempt = useExerciseFlowStore((s) => s.lastAttempt);
  const isStepsExercise = exercise.targetSteps !== null;

  const completeMutation = useCompleteExercise();

  useEffect(() => {
    const flow = useExerciseFlowStore.getState();
    flow.clearLastResult();
    flow.start(exercise.exerciseId, sessionId);
    return () => useExerciseFlowStore.getState().reset();
  }, [exercise.exerciseId, sessionId]);

  const complete = useCallback(
    async (input: Pick<CompleteExerciseInput, 'body' | 'frames'>) => {
      const flow = useExerciseFlowStore.getState();
      const response = await completeMutation.mutateAsync({
        sessionId,
        exerciseId: exercise.exerciseId,
        ...input,
      });
      if (response.accepted) flow.setResult(response);
      else flow.setAttemptRejected(response.attempt);
    },
    [completeMutation, exercise.exerciseId, sessionId],
  );

  const submitPhotos = useCallback(
    async (uris: string[], frameTimes: number[]) => {
      const flow = useExerciseFlowStore.getState();
      flow.setPhotoUris(uris, frameTimes);
      // камера не змогла зробити достатньо кадрів — сервер однаково відхилить, тож одразу просимо пересняти
      if (uris.length < PHOTO.MIN_FRAMES) return flow.setError(ErrorCode.PhotosRequired);
      flow.setPhase('uploading');
      flow.setUploadProgress(0);
      try {
        // кадри й зарахування — одним запитом (див. useCompleteExercise)
        await complete({ frames: { fileUris: uris, frameTimes, onProgress: flow.setUploadProgress } });
      } catch (error) {
        flow.setError(toApiError(error).code);
      }
    },
    [complete],
  );

  const submitSteps = useCallback(
    async (steps: number) => {
      const flow = useExerciseFlowStore.getState();
      flow.setSteps(steps);
      flow.setPhase('uploading');
      flow.setUploadProgress(1);
      try {
        await complete({ body: { photoKeys: [], steps } });
      } catch (error) {
        flow.setError(toApiError(error).code);
      }
    },
    [complete],
  );

  return {
    phase,
    photoUris,
    uploadProgress,
    errorCode,
    result,
    lastAttempt,
    isStepsExercise,
    start: () => useExerciseFlowStore.getState().setPhase(isStepsExercise ? 'stepping' : 'capturing'),
    onCaptured: (uris, frameTimes) => void submitPhotos(uris, frameTimes),
    onStepsReached: (steps) => void submitSteps(steps),
    retry: () => {
      const flow = useExerciseFlowStore.getState();
      if (flow.errorCode === ErrorCode.PhotosRequired) return flow.retryCapture();
      if (flow.errorCode === ErrorCode.StepsNotReached) return flow.setPhase('stepping');
      if (isStepsExercise) return void submitSteps(flow.steps);
      return void submitPhotos(flow.photoUris, flow.frameTimes);
    },
    retryCapture: () => useExerciseFlowStore.getState().retryCapture(),
  };
}
