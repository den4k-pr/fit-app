import { IsString, Length } from 'class-validator';
import { PLAN } from '../../../common/constants';

/** PATCH /families/current: лише role=child — перейменувати батька/матір у перемикачі */
export class UpdateFamilyDto {
  @IsString()
  @Length(1, PLAN.PARENT_LABEL_MAX)
  parentLabel: string;
}
