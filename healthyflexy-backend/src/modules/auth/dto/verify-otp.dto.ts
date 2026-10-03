import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { E164_REGEX, OTP_CODE_REGEX } from '../../../common/constants';
import { DevicePlatform } from '../../../common/enums';

/** POST /auth/otp/verify */
export class VerifyOtpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value))
  @IsString()
  @Matches(E164_REGEX, { message: 'phone must be in E.164 format' })
  phone: string;

  /** 6-значний код із SMS */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(OTP_CODE_REGEX, { message: 'code must be 6 digits' })
  code: string;

  /** Ідентифікатор інсталяції застосунку (генерується клієнтом і зберігається в SecureStore) */
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
