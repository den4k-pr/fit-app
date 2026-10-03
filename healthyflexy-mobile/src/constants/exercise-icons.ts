import type { IconName } from '@/shared/ui/Icon';

/**
 * Іконка кожної відео-вправи (підібрана логічно за рухом/назвою). Використовується у списку завдань замість
 * постерів/мініатюр: список лишається легким, а іконки однозначно впізнаються.
 */
export const EXERCISE_ICON: Record<string, IconName> = {
  squat: 'arrow-down-up',
  'push-up': 'dumbbell',
  'forward-lunge': 'footprints',
  'wall-sit': 'person-standing',
  plank: 'stretch-horizontal',
  crunch: 'rotate',
  'mountain-climber': 'mountain',
  'jumping-jacks': 'zap',
  'high-knees': 'heart-pulse',
  burpee: 'flame',
};

export function getExerciseIcon(slug: string): IconName | undefined {
  return EXERCISE_ICON[slug];
}
