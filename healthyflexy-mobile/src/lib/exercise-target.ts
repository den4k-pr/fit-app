import type { TFunction } from 'i18next';
import type { TodayExercise } from '@/types';

/** «10 повторень» / «30 секунд» / «1000 кроків» залежно від targetReps / targetSeconds / targetSteps */
export function formatTarget(
  exercise: Pick<TodayExercise, 'targetReps' | 'targetSeconds'> & { targetSteps?: number | null },
  t: TFunction,
): string {
  if (exercise.targetSteps != null) return t('exercise.steps', { count: exercise.targetSteps });
  if (exercise.targetReps !== null) return t('exercise.reps', { count: exercise.targetReps });
  if (exercise.targetSeconds !== null) return t('exercise.seconds', { count: exercise.targetSeconds });
  return '';
}
