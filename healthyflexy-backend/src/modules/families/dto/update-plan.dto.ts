import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsUUID,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { HH_MM_REGEX, PLAN } from '../../../common/constants';
import { Currency, ExerciseMode, WorkoutType } from '../../../common/enums';
import { IsStepOf } from '../../../common/validators';

/**
 * PATCH /families/current/plan: лише role=child.
 * Зміни діють З НАСТУПНОГО ДНЯ (сьогоднішній день і минулі не змінюються).
 */
export class UpdatePlanDto {
  /** Дні занять, ISO: 1 = Пн … 7 = Нд. Напр. [1, 2, 4, 5] */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  planDays?: number[];

  /** Ставка за день: 1–20, крок 0.5 */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PLAN.RATE_MIN)
  @Max(PLAN.RATE_MAX)
  @IsStepOf(PLAN.RATE_STEP)
  rate?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  /** «Види навантаження»: які види вправ входять у день (мінімум один) */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(WorkoutType, { each: true })
  workoutTypes?: WorkoutType[];

  /** «Час тренування», хв: 5–60, крок 5 */
  @IsOptional()
  @IsInt()
  @Min(PLAN.WORKOUT_MINUTES_MIN)
  @Max(PLAN.WORKOUT_MINUTES_MAX)
  @IsStepOf(PLAN.WORKOUT_MINUTES_STEP)
  workoutMinutes?: number;

  /** «Автоускладнення»: увімкнення починає відлік тижнів з сьогодні */
  @IsOptional()
  @IsBoolean()
  autoProgression?: boolean;

  /** Темп зростання, % на тиждень: 1–100 */
  @IsOptional()
  @IsInt()
  @Min(PLAN.PROGRESSION_PCT_MIN)
  @Max(PLAN.PROGRESSION_PCT_MAX)
  progressionPct?: number;

  /** Підбір вправ: `ai` — алгоритм ШІ, `manual` — відмічені вправи каталогу */
  @IsOptional()
  @IsEnum(ExerciseMode)
  exerciseMode?: ExerciseMode;

  /** Вправи каталогу для щоденного плану (режим `manual`); порожньо — активна програма */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  selectedExerciseIds?: string[];

  /** Час нагадування батьку/матері, HH:mm */
  @IsOptional()
  @Matches(HH_MM_REGEX, { message: 'reminderTime must be HH:mm (24h)' })
  reminderTime?: string;
}
