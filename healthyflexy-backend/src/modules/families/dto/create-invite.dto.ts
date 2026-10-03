import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PLAN } from '../../../common/constants';
import { RelationshipType } from '../../../common/enums';
import { IsStepOf } from '../../../common/validators';

/** POST /families/invites: лише role=child («+ Додати» батька/матір) */
export class CreateInviteDto {
  /** Ким дитині приходиться людина, яку запрошують */
  @IsEnum(RelationshipType)
  relationship: RelationshipType;

  /** Як дитина називатиме цього батька/матір у перемикачі («Мама», «Бабуся») */
  @IsOptional()
  @IsString()
  @Length(1, PLAN.PARENT_LABEL_MAX)
  parentLabel?: string;

  /** Стартова ставка за день (1–20, крок 0.5); без неї — стандартна */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PLAN.RATE_MIN)
  @Max(PLAN.RATE_MAX)
  @IsStepOf(PLAN.RATE_STEP)
  rate?: number;
}
