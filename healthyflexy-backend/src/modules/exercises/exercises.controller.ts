import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExerciseResponseDto } from './dto';
import { ExercisesService } from './exercises.service';

/** GET /exercises (активні, за sortOrder), GET /exercises/:id: тексти мовою користувача */
@ApiTags('exercises')
@ApiBearerAuth()
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ExerciseResponseDto[]> {
    return this.exercises.listActive(user.language);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.getById(id, user.language);
  }
}
