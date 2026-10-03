import { ExerciseCategory } from '@/types';
import { colors, type ColorToken } from './tokens';

/** Фон плитки-іконки вправи за категорією (`.ex-icon` у макеті) */
export const CATEGORY_BACKGROUND: Record<ExerciseCategory, ColorToken> = {
  [ExerciseCategory.Strength]: 'categoryStrength',
  [ExerciseCategory.Cardio]: 'categoryCardio',
  [ExerciseCategory.Balance]: 'categoryBalance',
  [ExerciseCategory.Breathing]: 'categoryBreathing',
  [ExerciseCategory.JointMobility]: 'categoryJointMobility',
  [ExerciseCategory.Stretch]: 'categoryStretch',
};

export const categoryBackground = (category: ExerciseCategory): string =>
  colors[CATEGORY_BACKGROUND[category]];
