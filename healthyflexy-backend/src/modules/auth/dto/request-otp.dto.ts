import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { E164_REGEX } from '../../../common/constants';

/** POST /auth/otp/request */
export class RequestOtpDto {
  /** Номер телефону в форматі E.164, напр. `+48501234567` (пробіли, дужки й дефіси прибираються) */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value))
  @IsString()
  @Matches(E164_REGEX, { message: 'phone must be in E.164 format, e.g. +48501234567' })
  phone: string;
}
