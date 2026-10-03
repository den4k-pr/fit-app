import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { ErrorCode, PHOTO } from '../../common/constants';
import { ExerciseState, SessionStatus } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { ExercisesService } from '../exercises/exercises.service';
import { Family } from '../families/entities/family.entity';
import { FamilyContextService } from '../families/family-context.service';
import { BalanceService } from '../ledger/balance.service';
import { toAssignmentResponse } from '../programs/programs.mapper';
import { ProgramsService } from '../programs/programs.service';
import { StorageService } from '../storage/storage.service';
import { CalendarService } from './calendar.service';
import { DayClockService } from './day-clock.service';
import { DaySessionsService } from './day-sessions.service';
import {
  CalendarResponseDto,
  CompleteExerciseDto,
  CompleteExerciseResponseDto,
  CompleteWithFramesDto,
  CreateUploadUrlDto,
  DayDetailResponseDto,
  PhotosUrlResponseDto,
  PlannedDayResponseDto,
  TodayExerciseDto,
  TodayResponseDto,
  UploadUrlResponseDto,
} from './dto';
import { DaySession } from './entities/day-session.entity';
import { ExerciseAttemptLog } from './entities/exercise-attempt-log.entity';
import { ExerciseRecord } from './entities/exercise-record.entity';
import { ExerciseCompletionService } from './exercise-completion.service';
import { StatsService } from './stats.service';
import { toRecordResponse, toSessionResponse } from './workouts.mapper';

/** Найбільший проміжок днів для GET /workouts/days?from&to */
const MAX_DAYS_RANGE = 31;

/** Фасад для контролера: збирає відповіді з доменних сервісів. Права й сім'я беруться з токена, не з запиту. */
@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    @InjectRepository(ExerciseRecord) private readonly records: Repository<ExerciseRecord>,
    @InjectRepository(ExerciseAttemptLog) private readonly attempts: Repository<ExerciseAttemptLog>,
    private readonly context: FamilyContextService,
    private readonly daySessions: DaySessionsService,
    private readonly completion: ExerciseCompletionService,
    private readonly exercises: ExercisesService,
    private readonly programs: ProgramsService,
    private readonly stats: StatsService,
    private readonly balance: BalanceService,
    private readonly calendar: CalendarService,
    private readonly clock: DayClockService,
    private readonly storage: StorageService,
  ) {}

  async getToday(user: AuthenticatedUser): Promise<TodayResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const tz = family.parent.timezone;
    // самолікування: закриваємо минулі дні цієї сім'ї, не чекаючи cron (серія й календар одразу коректні)
    // (після першого відкриття за день — миттєво, див. кеш у DaySessionsService)
    const [assignment] = await Promise.all([
      this.programs.activeAssignment(family.id),
      this.daySessions.closeFamilyPastDays(family, tz),
    ]);
    const today = this.clock.localDate(tz);
    // баланс не залежить від дня — паралельно з усім іншим
    const balancePromise = this.balance.getBalance(family.id);
    const session = await this.daySessions.getOrCreateToday(family, family.parent, assignment);
    const [active, balance, streak, records] = await Promise.all([
      this.programs.getTodayExercises(family.id, today, { family, session, assignment }),
      balancePromise,
      // серія рахується після закриття минулих днів (інакше пропуски ще не видно)
      this.stats.computeStreak(family.id, today),
      session ? this.records.find({ where: { sessionId: session.id } }) : Promise.resolve([]),
    ]);
    const programName = assignment
      ? toAssignmentResponse(assignment, user.language).programName
      : null;

    const base = {
      localDate: today,
      nextPlanDate: this.clock.nextPlanDate(family.planDays, today),
      streak,
      owed: balance.owed,
      currency: family.currency,
      rate: session?.rate ?? family.rate,
      // план є і без програми: підбір ШІ або відмічені спонсором вправи
      hasActiveProgram: assignment !== null || !this.programs.usesProgram(family),
      programName: this.programs.usesProgram(family) ? programName : null,
      exerciseMode: family.exerciseMode,
    };
    if (!session) return { ...base, restDay: true, session: null, exercises: [] };

    const finished = session.status === SessionStatus.COMPLETED;
    const open =
      session.status === SessionStatus.PENDING || session.status === SessionStatus.IN_PROGRESS;
    // порядок не важливий: кожна невиконана вправа доступна, поки день відкритий
    const stateOf = (exerciseId: string): ExerciseState => {
      const record = records.find((r) => r.exerciseId === exerciseId);
      if (record) return record.skipped ? ExerciseState.SKIPPED : ExerciseState.DONE;
      return open && !finished ? ExerciseState.CURRENT : ExerciseState.LOCKED;
    };
    const exercises: TodayExerciseDto[] = active.map((e) => ({
      exerciseId: e.id,
      slug: e.slug,
      sortOrder: e.sortOrder,
      category: e.category,
      name: this.exercises.localize(e.name, user.language),
      targetReps: e.targetReps,
      targetSeconds: e.targetSeconds,
      targetSteps: e.targetSteps,
      recordMaxSec: e.recordMaxSec,
      demoVideoUrl: e.demoVideoUrl,
      benefit: this.exercises.localize(e.benefit, user.language),
      description: e.description ? this.exercises.localize(e.description, user.language) : null,
      voicePattern: e.voicePattern ?? null,
      safetyInstructions: e.safetyInstructions
        ? this.exercises.localize(e.safetyInstructions, user.language)
        : null,
      sourceTitle: e.sourceTitle,
      sourceUrl: e.sourceUrl,
      state: stateOf(e.id),
      recordId: records.find((r) => r.exerciseId === e.id)?.id ?? null,
      info: this.exercises.info(e, user.language),
    }));
    return { ...base, restDay: false, session: toSessionResponse(session), exercises };
  }

  /** Підписані URL для 1–24 кадрів. Лише для сьогоднішньої відкритої сесії й ПОТОЧНОЇ вправи. */
  async createUploadUrl(
    user: AuthenticatedUser,
    dto: CreateUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    await this.assertCurrentExercise(user, family, dto.sessionId, dto.exerciseId);

    const uploads = await this.storage.createPhotoUploads(
      { familyId: family.id, sessionId: dto.sessionId, exerciseId: dto.exerciseId },
      dto.frames,
    );
    return {
      uploads: uploads.map((u) => ({
        photoKey: u.photoKey,
        uploadUrl: u.url,
        method: u.method,
        headers: u.headers,
      })),
      expiresInSeconds: PHOTO.UPLOAD_URL_TTL_SECONDS,
      maxBytes: PHOTO.MAX_BYTES,
    };
  }

  /**
   * Кадри + зарахування одним запитом (multipart). Перевірки ті самі, що в «uploads» + «complete»:
   * сесія сім'ї, сьогоднішня й відкрита, вправа — поточна; кадри JPEG ≤ 1 МБ. Повтор уже зарахованої
   * вправи (відповідь загубилась у мережі) — ідемпотентний: кадри не пишуться, повертається наявний запис.
   */
  async completeWithFrames(
    user: AuthenticatedUser,
    sessionId: string,
    exerciseId: string,
    files: { buffer: Buffer; mimetype: string }[],
    dto: CompleteWithFramesDto,
  ): Promise<CompleteExerciseResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const done = await this.records.exists({
      where: { sessionId, exerciseId, session: { familyId: family.id } },
    });
    if (done)
      return this.completion.complete(
        user,
        sessionId,
        exerciseId,
        { photoKeys: [] },
        {
          family,
          frames: [],
        },
      );
    await this.assertCurrentExercise(user, family, sessionId, exerciseId);
    const photoKeys = await this.storage.putPhotos(
      { familyId: family.id, sessionId, exerciseId },
      files,
    );
    return this.completion.complete(
      user,
      sessionId,
      exerciseId,
      { photoKeys, frameTimes: dto.frameTimes },
      { family, frames: files.map((f) => f.buffer) },
    );
  }

  /** Сесія належить сім'ї, сьогоднішня й відкрита, а вправа входить у склад дня */
  private async assertCurrentExercise(
    user: AuthenticatedUser,
    family: Family,
    sessionId: string,
    exerciseId: string,
  ): Promise<void> {
    const session = await this.sessions.findOne({ where: { id: sessionId, familyId: family.id } });
    if (!session) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);

    const open =
      session.status === SessionStatus.PENDING || session.status === SessionStatus.IN_PROGRESS;
    if (!open || session.date !== this.clock.localDate(user.timezone)) {
      throw new AppException(ErrorCode.DAY_ALREADY_CLOSED, HttpStatus.CONFLICT);
    }
    const active = await this.programs.getTodayExercises(family.id, session.date, {
      family,
      session,
    });
    // будь-яка вправа дня (порядок виконання не важливий)
    if (!active.some((e) => e.id === exerciseId))
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  complete(
    user: AuthenticatedUser,
    sessionId: string,
    exerciseId: string,
    dto: CompleteExerciseDto,
  ): Promise<CompleteExerciseResponseDto> {
    return this.completion.complete(user, sessionId, exerciseId, dto);
  }

  /** Пропустити вправу без оплати (не вдалася / не зарахована) — інші вправи дня лишаються доступними */
  skip(
    user: AuthenticatedUser,
    sessionId: string,
    exerciseId: string,
  ): Promise<CompleteExerciseResponseDto> {
    return this.completion.skip(user, sessionId, exerciseId);
  }

  async getCalendar(user: AuthenticatedUser, month: string): Promise<CalendarResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    return this.calendar.getMonth(family, month, family.parent.timezone);
  }

  async getDayDetail(user: AuthenticatedUser, date: string): Promise<DayDetailResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const session = await this.sessions.findOne({ where: { familyId: family.id, date } });
    // Немає запису на цю дату — нормальний стан (новий акаунт, день поза планом): 200 з порожнім тілом, не 404.
    if (!session) return { session: null, records: [] };
    const [detail] = await this.detailsOf([session], user.language);
    return detail;
  }

  /** Дні із записом у проміжку [from, to] від найновішого; решта днів просто відсутні у відповіді */
  async getDaysDetail(
    user: AuthenticatedUser,
    from: string,
    to: string,
  ): Promise<DayDetailResponseDto[]> {
    if (from > to || this.clock.addDays(from, MAX_DAYS_RANGE - 1) < to)
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    const family = await this.context.requireFamilyFor(user.id);
    const sessions = await this.sessions.find({
      where: { familyId: family.id, date: Between(from, to) },
      order: { date: 'DESC' },
    });
    return this.detailsOf(sessions, user.language);
  }

  /** Записи й оцінки AI для кількох днів — двома запитами на всі дні разом */
  private async detailsOf(
    sessions: DaySession[],
    language: AuthenticatedUser['language'],
  ): Promise<DayDetailResponseDto[]> {
    if (sessions.length === 0) return [];
    const records = await this.records
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.exercise', 'exercise')
      .where('r.session_id IN (:...ids)', { ids: sessions.map((s) => s.id) })
      .orderBy('r.completedAt', 'ASC')
      .getMany();
    const attempts = records.length
      ? await this.attempts.find({
          where: { exerciseRecordId: In(records.map((r) => r.id)) },
          select: { exerciseRecordId: true, score: true },
        })
      : [];
    return sessions.map((session) => ({
      session: toSessionResponse(session),
      records: records
        .filter((r) => r.sessionId === session.id)
        .map((r) => ({
          ...toRecordResponse(
            r,
            this.exercises.localize(r.exercise.name, language),
            r.exercise.slug,
          ),
          aiScore: attempts.find((a) => a.exerciseRecordId === r.id)?.score ?? null,
          info: this.exercises.info(r.exercise, language),
        })),
    }));
  }

  /** Склад дня з «Програми тренувань» (календар на «Сьогодні» / у «Прогресі») */
  async getPlannedDay(user: AuthenticatedUser, date: string): Promise<PlannedDayResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const session = await this.sessions.findOne({ where: { familyId: family.id, date } });
    const planned = session !== null || family.planDays.includes(this.clock.isoWeekday(date));
    if (!planned) return { date, planned: false, exercises: [] };
    const exercises = await this.programs.getTodayExercises(family.id, date, { family, session });
    return {
      date,
      planned: true,
      exercises: exercises.map((e) => ({
        exerciseId: e.id,
        slug: e.slug,
        name: this.exercises.localize(e.name, user.language),
        targetReps: e.targetReps,
        targetSeconds: e.targetSeconds,
        targetSteps: e.targetSteps,
        info: this.exercises.info(e, user.language),
      })),
    };
  }

  /** Кадри вправи для дитини: підписані URL на 1 годину. Видалені → 410, не було → 404. */
  async getPhotos(user: AuthenticatedUser, recordId: string): Promise<PhotosUrlResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const record = await this.records.findOne({
      where: { id: recordId },
      relations: { session: true },
    });
    // чужий запис виглядає як неіснуючий (не розкриваємо факт існування)
    if (!record || record.session.familyId !== family.id)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    if (record.photoKeys.length === 0)
      throw new AppException(ErrorCode.PHOTOS_NOT_AVAILABLE, HttpStatus.NOT_FOUND);
    const info = toRecordResponse(record, '', '');
    if (info.photosDeleted) throw new AppException(ErrorCode.PHOTOS_DELETED, HttpStatus.GONE);

    const urls = await this.storage.createPhotoDownloadUrls(record.photoKeys);
    const attempt = await this.attempts.findOne({ where: { exerciseRecordId: record.id } });
    return {
      photos: urls.map((url, i) => ({ index: i + 1, url })),
      expiresInSeconds: PHOTO.VIEW_URL_TTL_SECONDS,
      attempt: attempt
        ? {
            score: attempt.score,
            feedback: attempt.feedback,
            recommendations: attempt.recommendations,
          }
        : null,
    };
  }
}
