import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/message-response.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityService } from './activity.service';
import { ActivityQueryDto, ActivityResponseDto, SyncStepsDto } from './dto/activity.dto';

/**
 * PUT /activity/steps           @Roles(parent)  підсумки кроків за дні з крокоміра телефона
 * GET /activity?period=7        обидві ролі     графік «Кроки і тренування»
 */
@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Put('steps')
  @Roles(UserRole.PARENT)
  async sync(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncStepsDto,
  ): Promise<SuccessResponseDto> {
    await this.activity.syncSteps(userId, dto.days);
    return { success: true };
  }

  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ActivityQueryDto,
  ): Promise<ActivityResponseDto> {
    return this.activity.getActivity(user, query.period);
  }
}
