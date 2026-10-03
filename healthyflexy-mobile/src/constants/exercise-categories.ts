import type { IconName } from '@/shared/ui/Icon';
import type { IconTone } from '@/shared/ui/IconBadge';
import { ExerciseCategory } from '@/types';

/** Іконка й колір категорії вправи (замість емодзі) */
export const CATEGORY_ICON: Record<ExerciseCategory, { icon: IconName; tone: IconTone }> = {
  [ExerciseCategory.Strength]: { icon: 'dumbbell', tone: 'strength' },
  [ExerciseCategory.Cardio]: { icon: 'heart-pulse', tone: 'cardio' },
  [ExerciseCategory.Balance]: { icon: 'person-standing', tone: 'balance' },
  [ExerciseCategory.Breathing]: { icon: 'wind', tone: 'breathing' },
  [ExerciseCategory.JointMobility]: { icon: 'rotate', tone: 'jointMobility' },
  [ExerciseCategory.Stretch]: { icon: 'stretch', tone: 'stretch' },
};

/** Ключі i18n назв категорій */
export const CATEGORY_LABEL_KEY = {
  [ExerciseCategory.Strength]: 'category.strength',
  [ExerciseCategory.Cardio]: 'category.cardio',
  [ExerciseCategory.Balance]: 'category.balance',
  [ExerciseCategory.Breathing]: 'category.breathing',
  [ExerciseCategory.JointMobility]: 'category.jointMobility',
  [ExerciseCategory.Stretch]: 'category.stretch',
} as const;
