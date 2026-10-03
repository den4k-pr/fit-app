import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProgramDurationType } from '../../../common/enums';

/**
 * Вправа у складі програми, як її надсилає редактор (мобайл): порядок = порядок елементів
 * масиву `exercises` (сервер сам проставляє sortOrder 1..N — так неможливо надіслати дублікати/дірки).
 */
export class ProgramExerciseInputDto {
  @IsUUID()
  exerciseId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetReps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetSeconds?: number;

  /** Лише для вправ на кроки: override цілі (100–20 000) */
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(20_000)
  targetSteps?: number;

  /** ISO: 1 = Пн … 7 = Нд */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  planDays: number[];
}

/** POST /programs: створення власної програми дитиною (name — одномовний текст користувача) */
export class CreateProgramDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ProgramDurationType)
  durationType: ProgramDurationType;

  @IsArray()
  @ArrayMinSize(1)
  // жорстка межа; робочий ліміт задається в CRM (app_config.limits.maxProgramExercises)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseInputDto)
  exercises: ProgramExerciseInputDto[];
}
