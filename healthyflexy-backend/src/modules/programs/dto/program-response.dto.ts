import { ExerciseCategory, ProgramDurationType } from '../../../common/enums';

export class ProgramExerciseResponseDto {
  exerciseId: string;
  slug: string;
  category: ExerciseCategory;
  /** Локалізовано мовою користувача */
  name: string;
  sortOrder: number;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки (крокомір): ціль у кроках; null — вправа з камерою */
  targetSteps: number | null;
  planDays: number[];
  /** «Користь» вправи мовою користувача */
  benefit: string;
  /** Група різновидів: на цьому місці програми вправи групи чергуються по днях */
  variantGroup: string | null;
}

export class ProgramResponseDto {
  id: string;
  /** Локалізовано мовою користувача */
  name: string;
  description: string | null;
  /** Список переваг/вмісту для екрана деталей (локалізовано); порожній масив у власних програм */
  highlights: string[];
  durationType: ProgramDurationType;
  isPreset: boolean;
  createdById: string | null;
  exercises: ProgramExerciseResponseDto[];
}

/** GET /programs/assignment/current: активна програма сім'ї, або null — «дитина ще не обрала програму» */
export class AssignmentResponseDto {
  id: string;
  programId: string;
  /** Локалізовано мовою користувача */
  programName: string;
  startDate: string;
  isActive: boolean;
}
