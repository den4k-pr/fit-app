import { IsString, Matches, ValidateIf } from 'class-validator';
import { EXPO_PUSH_TOKEN_REGEX } from '../../../common/constants';

/** PUT /users/me/push-token: `null` очищає токен (вихід / вимкнені сповіщення) */
export class UpdatePushTokenDto {
  @ValidateIf((o: UpdatePushTokenDto) => o.pushToken !== null)
  @IsString()
  @Matches(EXPO_PUSH_TOKEN_REGEX, { message: 'pushToken must be a valid Expo push token' })
  pushToken: string | null;
}
