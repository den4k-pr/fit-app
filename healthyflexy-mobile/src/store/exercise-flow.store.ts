import { create } from 'zustand';
import type { ClientErrorCode } from '@/api/errors';
import type { AcceptedCompletion, AttemptResult } from '@/types';

/**
 * Машина станів екрана вправи. Зарахування «без фото» немає: вправа з камерою зараховується лише
 * після AI-перевірки кадрів, вправа на кроки — лише коли крокомір нарахував ціль.
 *
 *  demo ──► capturing ──► uploading ──► done
 *    │          ▲             │
 *    │          │             ├──► error ──► uploading ще раз (ті самі кадри) | capturing (замало кадрів)
 *    │          └─────────────┴──► ai-rejected ──► capturing знову
 *    └──► stepping ──► uploading ──► done          (вправа на кроки)
 *
 *  demo        — дивиться демо-анімацію, читає «Користь» / «Безпека»
 *  capturing   — камера, відлік від recordMaxSec, 24 кадри рівномірно за час вправи (відео не пишемо)
 *  stepping    — крокомір рахує кроки до цілі
 *  uploading   — PUT кадрів у сховище (прогрес) → POST complete (AI аналізує кадри / сервер звіряє кроки)
 *  done        — «Вправу зараховано» (або «День виконано»)
 *  error       — мережа/сервер: «Спробувати ще раз»
 *  ai-rejected — AI не підтвердив вправу: фідбек + «Спробувати ще раз» (пересняти)
 */
export type ExercisePhase = 'demo' | 'capturing' | 'stepping' | 'uploading' | 'done' | 'error' | 'ai-rejected';

interface ExerciseFlowState {
  phase: ExercisePhase;
  exerciseId: string | null;
  sessionId: string | null;
  /** file:// URI стиснених кадрів (порожньо — вправа на кроки) */
  photoUris: string[];
  /** секунда вправи кожного кадру */
  frameTimes: number[];
  /** Вправа на кроки: скільки нарахував крокомір (для повторної відправки після помилки мережі) */
  steps: number;
  /** 0–1 */
  uploadProgress: number;
  errorCode: ClientErrorCode | null;
  /** Результат останнього complete (для екрана «Вправу зараховано» / «День виконано») */
  lastResult: AcceptedCompletion | null;
  /** Результат AI-аналізу відхиленої спроби */
  lastAttempt: AttemptResult | null;

  start: (exerciseId: string, sessionId: string) => void;
  setPhase: (phase: ExercisePhase) => void;
  setPhotoUris: (uris: string[], frameTimes: number[]) => void;
  setSteps: (steps: number) => void;
  setUploadProgress: (progress: number) => void;
  setError: (code: ClientErrorCode) => void;
  setResult: (result: AcceptedCompletion) => void;
  setAttemptRejected: (attempt: AttemptResult) => void;
  /** Пересняти після відхилення AI: назад у capturing, старі кадри скидаються */
  retryCapture: () => void;
  clearLastResult: () => void;
  reset: () => void;
}

const initial = {
  phase: 'demo' as ExercisePhase,
  exerciseId: null,
  sessionId: null,
  photoUris: [] as string[],
  frameTimes: [] as number[],
  steps: 0,
  uploadProgress: 0,
  errorCode: null,
  lastAttempt: null,
};

export const useExerciseFlowStore = create<ExerciseFlowState>((set) => ({
  ...initial,
  lastResult: null,
  start: (exerciseId, sessionId) => set({ ...initial, exerciseId, sessionId, lastResult: null }),
  setPhase: (phase) => set({ phase }),
  setPhotoUris: (photoUris, frameTimes) => set({ photoUris, frameTimes }),
  setSteps: (steps) => set({ steps }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setError: (code) => set({ errorCode: code, phase: 'error' }),
  setResult: (lastResult) => set({ lastResult, phase: 'done', uploadProgress: 1 }),
  setAttemptRejected: (lastAttempt) => set({ lastAttempt, phase: 'ai-rejected' }),
  retryCapture: () => set({ phase: 'capturing', photoUris: [], frameTimes: [], lastAttempt: null, uploadProgress: 0 }),
  clearLastResult: () => set({ lastResult: null }),
  reset: () => set({ ...initial }),
}));
