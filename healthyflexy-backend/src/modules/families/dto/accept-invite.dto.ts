import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { INVITE_CODE_REGEX } from '../../../common/constants';

/** POST /families/join: лише role=parent без сім'ї */
export class AcceptInviteDto {
  /** Регістр і пробіли ігноруються */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : value,
  )
  @IsString()
  @Matches(INVITE_CODE_REGEX, {
    message: 'code must be 6 characters (A-Z without I/L/O, digits 2-9)',
  })
  code: string;
}
