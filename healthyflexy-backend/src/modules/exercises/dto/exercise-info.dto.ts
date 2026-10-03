import { ExerciseCategory, VoicePattern, WorkoutType } from '../../../common/enums';
import { BodyImpact } from '../../../common/types';

/** Довідкові дані вправи для карток макета: «Вплив на організм», м'язи, тривалість, джерело */
export class ExerciseInfoDto {
  category: ExerciseCategory;
  workoutTypes: WorkoutType[];
  /** Орієнтовна тривалість, хв */
  durationMin: number;
  /** 0–100 за системами; null — не показувати */
  bodyImpact: BodyImpact | null;
  /** Задіяні м'язи мовою користувача */
  muscles: string[];
  sourceTitle: string | null;
  sourceUrl: string | null;
  /** «Користь» мовою користувача (показується всюди, де є вправа) */
  benefit: string;
  /** Як виконувати (техніка) мовою користувача; null — опису немає */
  description: string | null;
  /** Ритм голосового супроводу */
  voicePattern: VoicePattern | null;
  /** Група різновидів (вправи групи чергуються по днях) */
  variantGroup: string | null;
}
