import { useMutation, useQueryClient, type QueryClient, type UseMutationResult } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { api } from '@/api/gateway';
import { isApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { uploadViaSignedUrls } from '@/services/photos/signed-upload';
import { ExerciseState, SessionStatus, type AcceptedCompletion, type CompleteExerciseRequest, type CompleteExerciseResponse, type Today } from '@/types';

export interface CompleteExerciseInput {
  sessionId: string;
  exerciseId: string;
  /** Кроки / повтор без кадрів: звичайний JSON */
  body?: CompleteExerciseRequest;
  /** Кадри з камери: відправляються разом із зарахуванням */
  frames?: { fileUris: string[]; frameTimes?: number[]; onProgress?: (progress: number) => void };
}

/** Сервер ще без `complete-frames` (застосунок оновився раніше за бекенд) → запасний шлях */
const isMissingRoute = (error: unknown) => isApiError(error) && error.status === 404 && /Cannot POST/i.test(error.message);

async function send({ sessionId, exerciseId, body, frames }: CompleteExerciseInput): Promise<CompleteExerciseResponse> {
  if (!frames) return api.workouts.completeExercise(sessionId, exerciseId, body ?? { photoKeys: [] });
  // веб-перегляд: FormData з file-URI там не працює
  if (Platform.OS !== 'web') {
    try {
      return await api.workouts.completeWithFrames(sessionId, exerciseId, frames);
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }
  }
  const photoKeys = await uploadViaSignedUrls({ fileUris: frames.fileUris, sessionId, exerciseId, onProgress: frames.onProgress });
  return api.workouts.completeExercise(sessionId, exerciseId, { photoKeys, frameTimes: frames.frameTimes });
}

/**
 * «Сьогодні» одразу з відповіді сервера (без очікування перезавантаження). Порядок вправ не важливий: змінюється
 * стан лише цієї вправи (виконано / пропущено); коли день завершено — решта (якщо є) закривається.
 */
export function applyToToday(queryClient: QueryClient, result: AcceptedCompletion, exerciseId: string): void {
  queryClient.setQueryData<Today>(queryKeys.workouts.today(), (today) => {
    if (!today?.session || today.session.id !== result.session.id) return today;
    const finished = result.session.status === SessionStatus.Completed;
    return {
      ...today,
      session: result.session,
      owed: Math.round((today.owed + result.earned) * 100) / 100,
      exercises: today.exercises.map((e) => {
        if (e.exerciseId === exerciseId)
          return { ...e, state: result.record.skipped ? ExerciseState.Skipped : ExerciseState.Done, recordId: result.record.id };
        if (finished && e.state === ExerciseState.Current) return { ...e, state: ExerciseState.Locked };
        return e;
      }),
    };
  });
}

/**
 * Зарахування вправи (кадри + AI або кроки). Після успіху «Сьогодні» оновлюється з відповіді, а точні дані
 * (серія, календар; коли день завершено — баланс і журнал) дотягуються у фоні: раніше екран чекав
 * перезавантаження всього цього перед тим, як показати «Вправу зараховано».
 */
export function useCompleteExercise(): UseMutationResult<CompleteExerciseResponse, ApiError, CompleteExerciseInput> {
  const queryClient = useQueryClient();
  return useMutation<CompleteExerciseResponse, ApiError, CompleteExerciseInput>({
    mutationFn: send,
    onSuccess: (result, input) => {
      if (!result.accepted) return;
      applyToToday(queryClient, result, input.exerciseId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      if (result.dayCompleted) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      }
    },
  });
}
