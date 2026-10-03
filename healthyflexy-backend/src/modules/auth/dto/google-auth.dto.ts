import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform } from '../../../common/enums';

/** POST /auth/google: вхід через Google — ID-токен, отриманий застосунком від Google */
export class GoogleAuthDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  idToken: string;

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
