import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { AVATAR } from '../../../common/constants';

/** POST /users/me/avatar/upload: розмір стисненого JPEG */
export class CreateAvatarUploadDto {
  @IsInt()
  @Min(1)
  @Max(AVATAR.MAX_BYTES)
  sizeBytes: number;
}

export class AvatarUploadResponseDto {
  /** Передати в PUT /users/me/avatar після завантаження */
  avatarKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/** PUT /users/me/avatar: підтвердити завантажене фото */
export class SetAvatarDto {
  @IsString()
  @Matches(/^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/)
  avatarKey: string;
}
