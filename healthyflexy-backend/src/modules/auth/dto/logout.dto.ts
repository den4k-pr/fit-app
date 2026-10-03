import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /auth/logout: відкликає переданий refresh-токен */
export class LogoutDto {
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  refreshToken: string;
}
