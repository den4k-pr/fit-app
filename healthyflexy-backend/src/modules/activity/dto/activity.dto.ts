import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DayStepsDto {
  /** Локальна дата YYYY-MM-DD */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsInt()
  @Min(0)
  @Max(200_000)
  steps: number;
}

/** PUT /activity/steps: лише role=parent — підсумки кроків за дні (iOS: до 7 днів історії) */
export class SyncStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @ValidateNested({ each: true })
  @Type(() => DayStepsDto)
  days: DayStepsDto[];
}

export const ACTIVITY_PERIODS = ['7', '30', '90', '180', '365', 'all'] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];

/** GET /activity?period=7|30|90|180|365|all (макет: 7 днів · Місяць · 3 місяці · 6 місяців · Рік · Весь час) */
export class ActivityQueryDto {
  @IsIn(ACTIVITY_PERIODS)
  period: ActivityPeriod = '7';
}

export class ActivityBucketDto {
  /** Перший і останній день відрізка (YYYY-MM-DD) */
  from: string;
  to: string;
  /** Середня кількість кроків за день (лише дні, за які телефон надіслав кроки) */
  steps: number;
  /** Виконаних днів тренувань у відрізку */
  workouts: number;
  /** Запланованих днів тренувань у відрізку (виконані + пропущені + сьогоднішній) */
  planned: number;
}

export class ActivityResponseDto {
  period: ActivityPeriod;
  /** Крок відрізків: день / тиждень / місяць — клієнт форматує підписи осі */
  granularity: 'day' | 'week' | 'month';
  buckets: ActivityBucketDto[];
}
