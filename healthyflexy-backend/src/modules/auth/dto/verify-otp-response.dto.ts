import { UserResponseDto } from '../../users/dto/user-response.dto';
import { AuthTokensDto } from './auth-tokens.dto';

export class VerifyOtpResponseDto {
  tokens: AuthTokensDto;
  user: UserResponseDto;

  /** true — акаунт щойно створено: далі «Вибір ролі» */
  isNewUser: boolean;
}
