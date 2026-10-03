import type { ExerciseCategory } from '../enums';
import type { ExerciseInfo } from './workouts';

/** GET /exercises — тексти вже локалізовані мовою користувача */
export interface Exercise {
  id: string;
  slug: string;
  sortOrder: number;
  category: ExerciseCategory;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки (крокомір): ціль у кроках; null — вправа з камерою */
  targetSteps: number | null;
  /** ліміт відеозапису, секунди */
  recordMaxSec: number;
  demoVideoUrl: string | null;
  benefit: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  info: ExerciseInfo;
}
