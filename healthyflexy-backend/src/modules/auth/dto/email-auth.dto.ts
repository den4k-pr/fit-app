import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { OTP_CODE_REGEX } from '../../../common/constants';
import { DevicePlatform } from '../../../common/enums';
import { normalizeEmail } from '../../../common/utils/email.util';

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeEmail(value) : value;

/** POST /auth/email/request: надіслати код на пошту */
export class RequestEmailOtpDto {
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(254)
  email: string;
}

/** POST /auth/email/verify: підтвердити код із листа */
export class VerifyEmailOtpDto {
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** 6-значний код із листа */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(OTP_CODE_REGEX, { message: 'code must be 6 digits' })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;

  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;
}
