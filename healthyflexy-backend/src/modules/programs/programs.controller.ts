import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { FamilyContextService } from '../families/family-context.service';
import {
  AssignmentResponseDto,
  CreateProgramDto,
  ProgramResponseDto,
  UpdateProgramDto,
} from './dto';
import { ProgramsService } from './programs.service';

/**
 * GET   /programs/presets            обидві ролі   готові гериатричні пресети
 * GET   /programs/mine               @Roles(child) власні програми дитини
 * POST  /programs                    @Roles(child) створити програму
 * PATCH /programs/:id                @Roles(child) редагувати власну (не preset) програму
 * POST  /programs/:id/assign         @Roles(child) призначити (preset або власну) своїй сім'ї
 * GET   /programs/assignment/current обидві ролі   активна програма сім'ї (null — ще не обрана)
 */
@ApiTags('programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(
    private readonly programs: ProgramsService,
    private readonly familyContext: FamilyContextService,
  ) {}

  @Get('presets')
  presets(@CurrentUser() user: AuthenticatedUser): Promise<ProgramResponseDto[]> {
    return this.programs.listPresets(user.language);
  }

  @Get('mine')
  @Roles(UserRole.CHILD)
  mine(@CurrentUser() user: AuthenticatedUser): Promise<ProgramResponseDto[]> {
    return this.programs.listMine(user.id, user.language);
  }

  @Post()
  @Roles(UserRole.CHILD)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programs.create(user.id, user.language, dto);
  }

  @Patch(':id')
  @Roles(UserRole.CHILD)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programs.update(user.id, user.language, id, dto);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @Roles(UserRole.CHILD)
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentResponseDto> {
    return this.programs.assign(user, id);
  }

  @Get('assignment/current')
  async current(@CurrentUser() user: AuthenticatedUser): Promise<AssignmentResponseDto | null> {
    const family = await this.familyContext.requireFamilyFor(user.id);
    return this.programs.getCurrentAssignment(family.id, user.language);
  }
}
