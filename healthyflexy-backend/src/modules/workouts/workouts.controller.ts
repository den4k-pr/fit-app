import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ErrorCode, PHOTO } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CalendarQueryDto,
  CalendarResponseDto,
  CompleteExerciseDto,
  CompleteExerciseResponseDto,
  CompleteWithFramesDto,
  CreateUploadUrlDto,
  DayDetailResponseDto,
  DaysRangeQueryDto,
  PhotosUrlResponseDto,
  PlannedDayResponseDto,
  TodayResponseDto,
  UploadUrlResponseDto,
} from './dto';
import { WorkoutsService } from './workouts.service';

/**
 * GET  /workouts/today                                      @Roles(parent)
 * POST /workouts/uploads                                    @Roles(parent)  підписані URL для 1–24 кадрів
 * POST /workouts/:sessionId/exercises/:exerciseId/complete  @Roles(parent)
 * POST /workouts/:sessionId/exercises/:exerciseId/complete-frames  @Roles(parent)  кадри + зарахування одним запитом
 * POST /workouts/:sessionId/exercises/:exerciseId/skip     @Roles(parent)  пропустити вправу без оплати
 * GET  /workouts/calendar?month=YYYY-MM                     обидві ролі
 * GET  /workouts/days/:date                                 обидві ролі (деталі запису в журналі)
 * GET  /workouts/days?from&to                              обидві ролі (лише дні із записом; до 31 дня)
 * GET  /workouts/plan/:date                                 обидві ролі (календар «Програма тренувань»)
 * GET  /workouts/records/:recordId/photos                   @Roles(child)  (410 PHOTOS_DELETED)
 */
@ApiTags('workouts')
@ApiBearerAuth()
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get('today')
  @Roles(UserRole.PARENT)
  today(@CurrentUser() user: AuthenticatedUser): Promise<TodayResponseDto> {
    return this.workouts.getToday(user);
  }

  @Post('uploads')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  uploads(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    return this.workouts.createUploadUrl(user, dto);
  }

  @Post(':sessionId/exercises/:exerciseId/complete')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: CompleteExerciseDto,
  ): Promise<CompleteExerciseResponseDto> {
    return this.workouts.complete(user, sessionId, exerciseId, dto);
  }

  @Post(':sessionId/exercises/:exerciseId/skip')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  skip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ): Promise<CompleteExerciseResponseDto> {
    return this.workouts.skip(user, sessionId, exerciseId);
  }

  @Post(':sessionId/exercises/:exerciseId/complete-frames')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  @UseInterceptors(
    FilesInterceptor('frames', PHOTO.FRAMES_PER_EXERCISE, {
      storage: memoryStorage(),
      limits: { fileSize: PHOTO.MAX_BYTES, files: PHOTO.FRAMES_PER_EXERCISE, fields: 5 },
    }),
  )
  completeWithFrames(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @UploadedFiles() frames: Express.Multer.File[] | undefined,
    @Body() dto: CompleteWithFramesDto,
  ): Promise<CompleteExerciseResponseDto> {
    return this.workouts.completeWithFrames(user, sessionId, exerciseId, frames ?? [], dto);
  }

  @Get('calendar')
  calendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarResponseDto> {
    return this.workouts.getCalendar(user, query.month);
  }

  /** Кілька днів одним запитом (дашборд дитини: кадри за тиждень — раніше 7 окремих запитів) */
  @Get('days')
  days(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DaysRangeQueryDto,
  ): Promise<DayDetailResponseDto[]> {
    return this.workouts.getDaysDetail(user, query.from, query.to);
  }

  @Get('days/:date')
  day(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ): Promise<DayDetailResponseDto> {
    return this.workouts.getDayDetail(user, date);
  }

  @Get('plan/:date')
  plan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ): Promise<PlannedDayResponseDto> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'date must be YYYY-MM-DD',
      );
    return this.workouts.getPlannedDay(user, date);
  }

  @Get('records/:recordId/photos')
  @Roles(UserRole.CHILD)
  photos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): Promise<PhotosUrlResponseDto> {
    return this.workouts.getPhotos(user, recordId);
  }
}
