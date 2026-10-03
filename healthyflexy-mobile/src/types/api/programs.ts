import type { ExerciseCategory, ProgramDurationType } from '../enums';
import type { ISODate } from '../common';

export interface ProgramExerciseInput {
  exerciseId: string;
  targetReps?: number;
  targetSeconds?: number;
  targetSteps?: number;
  /** ISO: 1 = Пн … 7 = Нд */
  planDays: number[];
}

/** POST /programs, PATCH /programs/:id: редактор завжди надсилає повний стан чернетки */
export interface SaveProgramRequest {
  name: string;
  description?: string;
  durationType: ProgramDurationType;
  /** Порядок = порядок вправ програми */
  exercises: ProgramExerciseInput[];
}

export interface ProgramExercise {
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
  /** «Користь» вправи (локалізовано) */
  benefit: string;
  /** Група різновидів: на цьому місці вправи чергуються по днях */
  variantGroup: string | null;
}

export interface Program {
  id: string;
  /** Локалізовано мовою користувача */
  name: string;
  description: string | null;
  /** Список переваг/вмісту для екрана деталей (локалізовано); порожній масив у власних програм */
  highlights: string[];
  durationType: ProgramDurationType;
  isPreset: boolean;
  createdById: string | null;
  exercises: ProgramExercise[];
}

/** GET /programs/assignment/current: null — дитина ще не обрала програму */
export interface ProgramAssignment {
  id: string;
  programId: string;
  /** Локалізовано мовою користувача */
  programName: string;
  startDate: ISODate;
  isActive: boolean;
}
