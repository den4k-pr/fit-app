import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/message-response.dto';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountDeletionService } from './account-deletion.service';
import {
  AcceptConsentDto,
  AvatarUploadResponseDto,
  CreateAvatarUploadDto,
  SetAvatarDto,
  SetRoleDto,
  UpdateProfileDto,
  UpdatePushTokenDto,
  UserResponseDto,
} from './dto';
import { toUserResponse } from './users.mapper';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';

/**
 * GET    /users/me              → UserResponseDto
 * PATCH  /users/me              UpdateProfileDto → UserResponseDto   (мова, ім'я, вік, timezone, pushEnabled)
 * PUT    /users/me/role         SetRoleDto → UserResponseDto          (змінюється, поки немає сім'ї; далі ROLE_ALREADY_SET)
 * POST   /users/me/consent      AcceptConsentDto → UserResponseDto
 * PUT    /users/me/push-token   UpdatePushTokenDto → SuccessResponseDto
 * POST   /users/me/avatar/upload  CreateAvatarUploadDto → підписаний PUT для фото-аватара
 * PUT    /users/me/avatar     SetAvatarDto → UserResponseDto  (підтвердити завантажене фото)
 * DELETE /users/me/avatar     → UserResponseDto               (повернути емодзі-аватар)
 * DELETE /users/me              → SuccessResponseDto  (GDPR ст. 17)
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly deletion: AccountDeletionService,
    private readonly storage: StorageService,
  ) {}

  private async respond(user: Parameters<typeof toUserResponse>[0]): Promise<UserResponseDto> {
    return toUserResponse(user, await this.users.avatarUrlOf(user));
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.respond(await this.users.requireById(user.id));
  }

  @Patch('me')
  async update(
    @CurrentUser('id') id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.respond(await this.users.updateProfile(id, dto));
  }

  @Put('me/role')
  async setRole(@CurrentUser('id') id: string, @Body() dto: SetRoleDto): Promise<UserResponseDto> {
    return this.respond(await this.users.setRole(id, dto.role));
  }

  @Post('me/consent')
  @HttpCode(200)
  async consent(
    @CurrentUser('id') id: string,
    @Body() _dto: AcceptConsentDto,
  ): Promise<UserResponseDto> {
    return this.respond(await this.users.acceptConsent(id));
  }

  @Put('me/push-token')
  async pushToken(
    @CurrentUser('id') id: string,
    @Body() dto: UpdatePushTokenDto,
  ): Promise<SuccessResponseDto> {
    await this.users.setPushToken(id, dto.pushToken);
    return { success: true };
  }

  @Post('me/avatar/upload')
  @HttpCode(200)
  async avatarUpload(
    @CurrentUser('id') id: string,
    @Body() dto: CreateAvatarUploadDto,
  ): Promise<AvatarUploadResponseDto> {
    const target = await this.storage.createAvatarUpload(id, dto.sizeBytes);
    return {
      avatarKey: target.photoKey,
      uploadUrl: target.url,
      method: target.method,
      headers: target.headers,
    };
  }

  @Put('me/avatar')
  async setAvatar(
    @CurrentUser('id') id: string,
    @Body() dto: SetAvatarDto,
  ): Promise<UserResponseDto> {
    return this.respond(await this.users.setAvatar(id, dto.avatarKey));
  }

  @Delete('me/avatar')
  async removeAvatar(@CurrentUser('id') id: string): Promise<UserResponseDto> {
    return this.respond(await this.users.removeAvatar(id));
  }

  @Delete('me')
  async remove(@CurrentUser('id') id: string): Promise<SuccessResponseDto> {
    await this.deletion.deleteAccount(id);
    return { success: true };
  }
}
