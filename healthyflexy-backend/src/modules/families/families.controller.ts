import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import {
  AcceptInviteDto,
  CreateInviteDto,
  FamilyResponseDto,
  FamilyStatsResponseDto,
  InviteResponseDto,
  ParentStatusResponseDto,
  ReminderResponseDto,
  UpdateFamilyDto,
  UpdatePlanDto,
} from './dto';
import { FamiliesService } from './families.service';
import { InvitesService } from './invites.service';

/**
 * «current» = сім'я користувача; у дитини з кількома батьками — обрана в перемикачі (заголовок X-Family-Id).
 *   GET   /families                       усі сім'ї (дитина — перемикач батьків)
 *   PATCH /families/current               @Roles(child)  перейменувати батька/матір
 *   POST  /families/invites               @Roles(child)
 *   GET   /families/invites/active        @Roles(child)
 *   POST  /families/join                  @Roles(parent)
 *   GET   /families/current
 *   PATCH /families/current/plan          @Roles(child)
 *   GET   /families/current/stats
 *   GET   /families/current/parent-status @Roles(child)
 *   POST  /families/current/reminders     @Roles(child)  (1 раз / 2 год)
 */
@ApiTags('families')
@ApiBearerAuth()
@Controller('families')
export class FamiliesController {
  constructor(
    private readonly families: FamiliesService,
    private readonly invites: InvitesService,
    private readonly users: UsersService,
  ) {}

  @Post('invites')
  @Roles(UserRole.CHILD)
  createInvite(
    @CurrentUser('id') childId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.invites.create(childId, dto);
  }

  @Get('invites/active')
  @Roles(UserRole.CHILD)
  activeInvite(@CurrentUser('id') childId: string): Promise<InviteResponseDto | null> {
    return this.invites.getActive(childId);
  }

  @Post('join')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  async join(
    @CurrentUser('id') parentId: string,
    @Body() dto: AcceptInviteDto,
  ): Promise<FamilyResponseDto> {
    const family = await this.invites.accept(await this.users.requireById(parentId), dto.code);
    return this.families.toResponse(family, parentId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<FamilyResponseDto[]> {
    return this.families.list(user);
  }

  @Patch('current')
  @Roles(UserRole.CHILD)
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFamilyDto,
  ): Promise<FamilyResponseDto> {
    return this.families.rename(user, dto);
  }

  @Get('current')
  current(@CurrentUser() user: AuthenticatedUser): Promise<FamilyResponseDto> {
    return this.families.getCurrent(user);
  }

  @Patch('current/plan')
  @Roles(UserRole.CHILD)
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePlanDto,
  ): Promise<FamilyResponseDto> {
    return this.families.updatePlan(user, dto);
  }

  @Get('current/stats')
  stats(@CurrentUser() user: AuthenticatedUser): Promise<FamilyStatsResponseDto> {
    return this.families.getStats(user);
  }

  @Get('current/parent-status')
  @Roles(UserRole.CHILD)
  parentStatus(@CurrentUser() user: AuthenticatedUser): Promise<ParentStatusResponseDto> {
    return this.families.getParentStatus(user);
  }

  @Post('current/reminders')
  @HttpCode(200)
  @Roles(UserRole.CHILD)
  remind(@CurrentUser() user: AuthenticatedUser): Promise<ReminderResponseDto> {
    return this.families.sendReminder(user);
  }
}
