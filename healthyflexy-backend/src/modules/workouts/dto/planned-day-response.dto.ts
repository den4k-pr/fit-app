import { ExerciseInfoDto } from '../../exercises/dto/exercise-info.dto';

export class PlannedExerciseDto {
  exerciseId: string;
  slug: string;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  targetSteps: number | null;
  info: ExerciseInfoDto;
}

/**
 * GET /workouts/plan/:date (обидві ролі): склад дня з «Програми тренувань» — для календаря й деталей дня.
 * Для сьогодні/минулого — зафіксований склад дня; для майбутнього — за поточним планом і програмою.
 */
export class PlannedDayResponseDto {
  date: string;
  /** Чи день у плані занять */
  planned: boolean;
  exercises: PlannedExerciseDto[];
}
