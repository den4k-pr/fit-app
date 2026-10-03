import { ExerciseInfoDto } from '../../exercises/dto/exercise-info.dto';

/** Виконана вправа дня (для дашборда дитини та результату complete) */
export class ExerciseRecordResponseDto {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseSlug: string;

  /** Назва мовою користувача */
  exerciseName: string;

  /** Кількість кадрів (0–6); 0 → вправа на кроки */
  photoCount: number;

  /** Вправа на кроки: скільки нарахував крокомір; null — вправа з камерою */
  steps: number | null;

  /** Коли кадри буде видалено (completedAt + 7 днів); null, якщо кадрів не було */
  photosExpiresAt: Date | null;

  /** true → «Фото видалено» (спливли 7 днів) */
  photosDeleted: boolean;
  completedAt: Date;

  /** true → вправу пропущено (не виконано / не зараховано), оплати за неї немає */
  skipped: boolean;

  /** Деталі дня: оцінка AI (0–100) «Якість виконання»; null — вправа на кроки / без аналізу */
  aiScore?: number | null;

  /** Деталі дня: «Вплив на організм», м'язи, джерело */
  info?: ExerciseInfoDto;
}
