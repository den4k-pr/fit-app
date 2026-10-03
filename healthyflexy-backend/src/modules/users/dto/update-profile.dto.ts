import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AppLanguage } from '../../../common/enums';

/** PATCH /users/me: усі поля необов'язкові */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name?: string;

  /** Вік (необов'язково, 16–120) */
  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(AppLanguage)
  language?: AppLanguage;

  /** IANA-таймзона пристрою. Клієнт надсилає при кожному запуску. */
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  /** Перемикач сповіщень у профілі */
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}
