import { ExerciseCategory } from '../../../common/enums';
import { ExerciseInfoDto } from './exercise-info.dto';

/** GET /exercises: тексти вже локалізовані мовою користувача (fallback: en) */
export class ExerciseResponseDto {
  id: string;
  slug: string;
  sortOrder: number;
  category: ExerciseCategory;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки (крокомір): ціль у кроках; null — вправа з камерою */
  targetSteps: number | null;

  /** Ліміт відеозапису, секунди */
  recordMaxSec: number;
  demoVideoUrl: string | null;
  benefit: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  info: ExerciseInfoDto;
}
