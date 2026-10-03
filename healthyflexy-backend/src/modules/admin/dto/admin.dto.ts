import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AppLanguage,
  ExerciseCategory,
  ProgramDurationType,
  UserRole,
  VoicePattern,
  WorkoutType,
} from '../../../common/enums';

// ───── вхід ─────

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(1, 200)
  password: string;
}

export class AdminRefreshDto {
  @IsString()
  refreshToken: string;
}

// ───── спільне ─────

/** Текст чотирма мовами; обов'язкова лише українська — порожні мови сервер заповнює нею */
export class LocalizedTextDto {
  @IsString()
  @Length(1, 2000)
  uk: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ru?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  en?: string;
}

export class BodyImpactDto {
  @IsInt() @Min(0) @Max(100) muscles: number;
  @IsInt() @Min(0) @Max(100) heart: number;
  @IsInt() @Min(0) @Max(100) brain: number;
  @IsInt() @Min(0) @Max(100) bones: number;
  @IsInt() @Min(0) @Max(100) energy: number;
}

// ───── вправи ─────

export class CreateExerciseDto {
  /** Латиниця, цифри, дефіс: стабільний ключ (анімація вправи в застосунку шукається за ним) */
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug: только a-z, 0-9 и дефис' })
  @Length(2, 50)
  slug: string;

  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  benefit: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  safetyInstructions?: LocalizedTextDto | null;

  /** Як виглядає правильне виконання (англійською — для AI-перевірки) */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiCriteria?: string | null;

  @IsOptional() @IsInt() @Min(1) @Max(500) targetReps?: number | null;
  @IsOptional() @IsInt() @Min(5) @Max(600) targetSeconds?: number | null;
  @IsOptional() @IsInt() @Min(100) @Max(50000) targetSteps?: number | null;

  /** Тривалість зйомки вправи, с */
  @IsInt()
  @Min(5)
  @Max(120)
  recordMaxSec: number;

  @IsArray()
  @ArrayUnique()
  @IsEnum(WorkoutType, { each: true })
  workoutTypes: WorkoutType[];

  @IsInt()
  @Min(1)
  @Max(60)
  durationMin: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BodyImpactDto)
  bodyImpact?: BodyImpactDto | null;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  muscles: LocalizedTextDto[];

  @IsOptional()
  @IsUrl({ require_protocol: true })
  demoVideoUrl?: string | null;

  @IsOptional() @IsString() @MaxLength(255) sourceTitle?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  sourceUrl?: string | null;

  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;

  @IsBoolean()
  isActive: boolean;

  /** Група різновидів: вправи групи чергуються по днях на тому ж місці програми */
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'group: только a-z, 0-9 и дефис' })
  @Length(1, 40)
  variantGroup?: string | null;

  /** Ритм голосового супроводу */
  @IsOptional()
  @IsEnum(VoicePattern)
  voicePattern?: VoicePattern | null;
}

export class UpdateExerciseDto extends PartialType(CreateExerciseDto) {}

// ───── програми (базовий пакет) ─────

export class ProgramExerciseDto {
  @IsUUID()
  exerciseId: string;

  @IsOptional() @IsInt() @Min(1) @Max(500) targetReps?: number | null;
  @IsOptional() @IsInt() @Min(5) @Max(600) targetSeconds?: number | null;
  @IsOptional() @IsInt() @Min(100) @Max(50000) targetSteps?: number | null;

  /** ISO: 1 = Пн … 7 = Нд */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  planDays: number[];
}

export class CreateProgramDto {
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug: только a-z, 0-9 и дефис' })
  @Length(2, 100)
  slug?: string | null;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto | null;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  highlights: LocalizedTextDto[];

  @IsEnum(ProgramDurationType)
  durationType: ProgramDurationType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseDto)
  exercises: ProgramExerciseDto[];
}

export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

// ───── користувачі ─────

export class UsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn([...Object.values(UserRole), 'none'])
  role?: UserRole | 'none';

  @IsOptional()
  @IsIn(['active', 'blocked'])
  status?: 'active' | 'blocked';

  @IsOptional()
  @IsIn(['createdAt', 'lastLoginAt', 'name'])
  sort?: 'createdAt' | 'lastLoginAt' | 'name';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;
}

export class AdminUpdateUserDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;

  @IsOptional() @IsInt() @Min(16) @Max(120) age?: number | null;

  @IsOptional() @IsEnum(AppLanguage) language?: AppLanguage;
}

export class BlockUserDto {
  @IsBoolean()
  blocked: boolean;
}

export class AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  days: number = 30;
}

// ───── налаштування застосунку ─────

/** Токени кольорів, які CRM дозволено змінювати (дзеркало mobile `theme/tokens.ts`) */
export const THEME_KEYS = [
  'forest',
  'deep',
  'green',
  'greenDark',
  'greenButton',
  'greenButtonBase',
  'greenLight',
  'greenBorder',
  'mint',
  'paper',
  'shade',
  'border',
  'cream',
  'teal',
  'tealBg',
  'tealBorder',
  'pillGreenText',
  'ink',
  'soft',
  'muted',
] as const;

export class ThemeDto {
  @IsString()
  @Length(1, 40)
  presetId: string;

  @IsObject()
  colors: Record<string, string>;
}

export class LimitsDto {
  @IsOptional() @IsInt() @Min(1) @Max(30) maxExercisesPerDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(40) maxProgramExercises?: number;
}

export class UpdateAppConfigDto {
  /** null — повернути стандартну палітру */
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeDto)
  theme?: ThemeDto | null;

  /** мова → ключ тексту → значення (порожні значення видаляються = стандартний текст) */
  @IsOptional()
  @IsObject()
  content?: Record<string, Record<string, string>>;

  @IsOptional()
  @ValidateNested()
  @Type(() => LimitsDto)
  limits?: LimitsDto;
}
