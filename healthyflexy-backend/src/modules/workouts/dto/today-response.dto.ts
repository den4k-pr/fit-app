import {
  Currency,
  ExerciseCategory,
  ExerciseMode,
  ExerciseState,
  VoicePattern,
} from '../../../common/enums';
import { ExerciseInfoDto } from '../../exercises/dto/exercise-info.dto';
import { DaySessionResponseDto } from './day-session-response.dto';

/** Вправа у списку «Сьогодні» */
export class TodayExerciseDto {
  exerciseId: string;
  slug: string;
  sortOrder: number;
  category: ExerciseCategory;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки (крокомір): ціль у кроках; null — вправа з камерою */
  targetSteps: number | null;
  recordMaxSec: number;
  demoVideoUrl: string | null;
  benefit: string;
  /** Як виконувати (техніка); null — опису немає */
  description: string | null;
  /** Ритм голосового супроводу; null — за категорією */
  voicePattern: VoicePattern | null;
  /** Показати перед стартом вправи (гериатричний модуль); null для вправ без інструкції безпеки */
  safetyInstructions: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;

  /** done ✓ / skipped (пропущено, без оплати) / current «Старт» (будь-яка невиконана) / locked 🔒 (день закрито) */
  state: ExerciseState;

  /** id запису, якщо вправу вже виконано */
  recordId: string | null;

  /** «Вплив на організм», м'язи, тривалість (картки макета) */
  info: ExerciseInfoDto;
}

/** GET /workouts/today: лише role=parent */
export class TodayResponseDto {
  /** Локальна дата батька/матері, YYYY-MM-DD */
  localDate: string;

  /** true → день відпочинку (не в plan_days): session = null, exercises = [] */
  restDay: boolean;

  /** Найближчий запланований день (для «Наступне заняття: середа») */
  nextPlanDate: string | null;
  session: DaySessionResponseDto | null;
  exercises: TodayExerciseDto[];

  /** Поточна серія днів 🔥 */
  streak: number;

  /** «До отримання: €35» у шапці */
  owed: number;
  currency: Currency;

  /** Ставка за день (для банера «заробіть €5 сьогодні») */
  rate: number;

  /** false → дитина ще не призначила сім'ї жодної програми (порожній «Сьогодні» ≠ помилка) */
  hasActiveProgram: boolean;
  programName: string | null;

  /** Як складено день: підбір ШІ чи вправи, відмічені спонсором / програма */
  exerciseMode: ExerciseMode;
}
