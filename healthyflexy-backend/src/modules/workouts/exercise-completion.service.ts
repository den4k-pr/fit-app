import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AI_ANALYSIS, ErrorCode, PHOTO } from '../../common/constants';
import { fromCents, toCents } from '../../common/utils/money.util';
import {
  AppLanguage,
  ExerciseCategory,
  VoicePattern,
  LedgerStatus,
  LedgerType,
  SessionStatus,
} from '../../common/enums';
import {
  DayCompletedEvent,
  DomainEvent,
  ExerciseCompletedEvent,
} from '../../common/events/domain-events';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExercisesService } from '../exercises/exercises.service';
import { Family } from '../families/entities/family.entity';
import { FamilyContextService } from '../families/family-context.service';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { AiService } from '../ai/ai.service';
import { PRECHECK_FEEDBACK, precheckFrames } from '../ai/frame-precheck';
import { buildStoryboard, buildWindows } from '../ai/storyboard';
import { ProgramsService } from '../programs/programs.service';
import { StorageService } from '../storage/storage.service';
import { DayClockService } from './day-clock.service';
import { CompleteExerciseDto, CompleteExerciseResponseDto } from './dto';
import { DaySession } from './entities/day-session.entity';
import { ExerciseAttemptLog } from './entities/exercise-attempt-log.entity';
import { ExerciseRecord } from './entities/exercise-record.entity';
import { toRecordResponse, toSessionResponse } from './workouts.mapper';

/**
 * КЛЮЧОВА транзакційна логіка (ТЗ §8.2, 14.1). Усе в одній транзакції з блокуванням рядка дня (FOR UPDATE).
 * Клієнт НІКОЛИ не змінює баланс: earn створюється тут, за кожну зараховану вправу.
 * Вправи дня виконуються в БУДЬ-ЯКОМУ порядку; невдалу можна пропустити (`skip`) — без оплати.
 *
 * Перевірка ДО транзакції, залежно від типу вправи:
 *  - вправа з камерою: щонайменше PHOTO.MIN_FRAMES_FOR_ANALYSIS кадрів (інакше PHOTOS_REQUIRED) і AI-гейт —
 *    негативний вердикт (немає людини в кадрі / не та вправа / немає руху / isCorrect=false / score нижче
 *    порогу) блокує зарахування (accepted:false), сесія й ledger не чіпаються, батько/мати бачить фідбек і
 *    повторює спробу. Кожна спроба пишеться в ExerciseAttemptLog. Зарахування «без фото» більше НЕМАЄ.
 *  - вправа на кроки (targetSteps): крокомір телефона має нарахувати не менше цілі (інакше STEPS_NOT_REACHED).
 */
@Injectable()
export class ExerciseCompletionService {
  private readonly logger = new Logger(ExerciseCompletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ExerciseRecord) private readonly records: Repository<ExerciseRecord>,
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    @InjectRepository(ExerciseAttemptLog)
    private readonly attemptLogs: Repository<ExerciseAttemptLog>,
    private readonly context: FamilyContextService,
    private readonly programs: ProgramsService,
    private readonly exercises: ExercisesService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
    private readonly clock: DayClockService,
    private readonly events: EventEmitter2,
  ) {}

  async complete(
    user: AuthenticatedUser,
    sessionId: string,
    exerciseId: string,
    dto: CompleteExerciseDto,
    /** Кадри, що прийшли в самому запиті (multipart) і вже записані сервером під `dto.photoKeys` */
    uploaded?: { family: Family; frames: Buffer[] },
  ): Promise<CompleteExerciseResponseDto> {
    const family = uploaded?.family ?? (await this.context.requireFamilyFor(user.id));
    // Кадри мають бути справді завантажені й належати САМЕ цій вправі цього дня цієї сім'ї
    // (кадри з multipart сервер записав сам — перевіряти їх наявність у сховищі нема потреби)
    if (!uploaded)
      await this.storage.assertPhotosUploaded(
        { familyId: family.id, sessionId, exerciseId },
        dto.photoKeys,
      );

    // Чужа/неіснуюча сесія → NOT_FOUND ще до перевірок кадрів/кроків (не розкриваємо, яка вправа чекає)
    const ownSession = await this.sessions.exists({
      where: { id: sessionId, familyId: family.id },
    });
    if (!ownSession) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);

    // Ідемпотентність РАНІШЕ виклику AI (оптимізація): повторне надсилання вже прийнятої вправи
    // не палить виклик AI. Авторитетна перевірка ідемпотентності лишається ВСЕРЕДИНІ транзакції нижче.
    const existingRecord = await this.records.findOne({ where: { sessionId, exerciseId } });
    const today = this.clock.localDate(user.timezone);
    const active = await this.programs.getTodayExercises(family.id, today, { family });
    const exercise = active.find((e) => e.id === exerciseId);

    const isStepsExercise = exercise?.targetSteps != null;
    if (!existingRecord && exercise) {
      if (isStepsExercise) {
        if ((dto.steps ?? 0) < (exercise.targetSteps ?? 0) || dto.photoKeys.length > 0) {
          throw new AppException(ErrorCode.STEPS_NOT_REACHED, HttpStatus.UNPROCESSABLE_ENTITY);
        }
      } else if (dto.photoKeys.length < PHOTO.MIN_FRAMES_FOR_ANALYSIS) {
        throw new AppException(ErrorCode.PHOTOS_REQUIRED, HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }

    let attempt: ExerciseAttemptLog | null = null;
    if (!existingRecord && exercise && !isStepsExercise) {
      // спокійні вправи (дихання) й утримання (планка, стійка на одній нозі) не вимагають руху між кадрами
      const requiresMovement =
        exercise.category !== ExerciseCategory.BREATHING &&
        exercise.voicePattern !== VoicePattern.HOLD;
      // ліміт платних перевірок однієї вправи за день: далі — «пропустити без оплати»
      const attemptsToday = await this.attemptLogs.count({ where: { sessionId, exerciseId } });
      if (attemptsToday >= AI_ANALYSIS.MAX_ATTEMPTS_PER_EXERCISE)
        throw new AppException(ErrorCode.AI_ATTEMPTS_LIMIT, HttpStatus.TOO_MANY_REQUESTS);

      const frameTimes = frameTimesFor(dto, exercise.recordMaxSec);
      const frames = await (
        uploaded ? Promise.resolve(uploaded.frames) : this.storage.readPhotos(dto.photoKeys)
      ).catch((error: unknown) => {
        this.logger.error({ event: 'frames_read_failed', exerciseId, reason: String(error) });
        throw new AppException(ErrorCode.AI_ANALYSIS_FAILED, HttpStatus.BAD_GATEWAY);
      });

      // безкоштовна перевірка ДО платного AI: закрита камера / темно / зовсім без руху
      const precheck = await precheckFrames(frames, requiresMovement).catch(() => null);
      if (precheck?.problem) {
        const copy =
          PRECHECK_FEEDBACK[precheck.problem][user.language] ??
          PRECHECK_FEEDBACK[precheck.problem][AppLanguage.UK];
        await this.attemptLogs.save(
          this.attemptLogs.create({
            sessionId,
            exerciseId,
            photoKeys: dto.photoKeys,
            isCorrect: false,
            score: 0,
            feedback: copy.feedback,
            recommendations: copy.recommendations,
            issues: [],
          }),
        );
        this.logger.log({
          event: 'exercise_precheck_rejected',
          exerciseId,
          sessionId,
          problem: precheck.problem,
          brightness: Math.round(precheck.brightness),
          maxChange: Math.round(precheck.maxChange * 10) / 10,
        });
        return {
          accepted: false,
          attempt: { score: 0, isCorrect: false, ...copy, issues: [] },
        };
      }

      // розкадровка: кадри в сітках + відрізки часу, які модель оцінює цілком (а не поштучно)
      const sheets = await buildStoryboard(frames, frameTimes).catch((error: unknown) => {
        this.logger.error({ event: 'storyboard_failed', exerciseId, reason: String(error) });
        throw new AppException(ErrorCode.AI_ANALYSIS_FAILED, HttpStatus.BAD_GATEWAY);
      });
      const result = await this.ai.analyze({
        exerciseName: localizeEn(exercise.name),
        exerciseDescription: exercise.description ? localizeEn(exercise.description) : null,
        safetyInstructions: exercise.safetyInstructions
          ? localizeEn(exercise.safetyInstructions)
          : null,
        criteria: exercise.aiCriteria,
        requiresMovement,
        sheets,
        frameCount: dto.photoKeys.length,
        windows: buildWindows(frameTimes),
        // відгук і причини відмови — мовою того, хто виконує вправу
        language: user.language,
      });
      attempt = await this.attemptLogs.save(
        this.attemptLogs.create({
          sessionId,
          exerciseId,
          photoKeys: dto.photoKeys,
          isCorrect: result.isCorrect,
          score: result.score,
          feedback: result.feedback,
          recommendations: result.recommendations,
          issues: result.issues,
        }),
      );
      if (!this.ai.accepts(result, requiresMovement)) {
        this.logger.log({
          event: 'exercise_ai_rejected',
          exerciseId,
          sessionId,
          score: result.score,
        });
        return {
          accepted: false,
          attempt: {
            score: result.score,
            isCorrect: result.isCorrect,
            feedback: result.feedback,
            recommendations: result.recommendations,
            issues: result.issues,
          },
        };
      }
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .getRepository(DaySession)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :sessionId AND s.familyId = :familyId', { sessionId, familyId: family.id })
        .getOne();
      if (!session) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);

      const activeExercise = active.find((e) => e.id === exerciseId);
      if (!activeExercise) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
      const records = manager.getRepository(ExerciseRecord);

      // Ідемпотентність: повторне зарахування тієї ж вправи повертає наявний запис
      const existing = await records.findOne({ where: { sessionId, exerciseId } });
      if (existing)
        return {
          session,
          record: existing,
          exercise: activeExercise,
          dayCompleted: false,
          earned: 0,
          created: false,
        };

      const todayLocal = this.clock.localDate(user.timezone);
      const open =
        session.status === SessionStatus.PENDING || session.status === SessionStatus.IN_PROGRESS;
      if (session.date !== todayLocal || !open)
        throw new AppException(ErrorCode.DAY_ALREADY_CLOSED, HttpStatus.CONFLICT);

      // порядок виконання не важливий: частка ставки — за місцем вправи у складі дня (сума за всі = ставка)
      const position = active.findIndex((e) => e.id === exerciseId);

      // exercisesTotal фіксується при СТВОРЕННІ сесії дня (getOrCreateToday) і міг лишитись застарілим —
      // напр. 0, якщо тоді ще не було активної програми, а дитина призначила її пізніше того ж дня.
      // Підтягуємо до поточного складу (лише вгору, щоб не зменшити нижче вже зарахованих вправ), інакше
      // exercisesDone міг перевищити застарілий exercisesTotal і впасти на CHECK-обмеженнях БД при завершенні дня.
      if (active.length > session.exercisesTotal) session.exercisesTotal = active.length;
      // день створено без програми (порожній знімок) → фіксуємо склад, щойно з'явилася програма
      if (!session.exerciseIds?.length && active.length > 0)
        session.exerciseIds = active.map((e) => e.id);

      const now = new Date();
      const record = await records.save(
        records.create({
          sessionId,
          exerciseId,
          photoKeys: dto.photoKeys,
          steps: activeExercise.targetSteps != null ? (dto.steps ?? null) : null,
          photosExpiresAt:
            dto.photoKeys.length > 0
              ? new Date(now.getTime() + PHOTO.RETENTION_DAYS * 86_400_000)
              : null,
          completedAt: now,
        }),
      );

      // Нарахування за КОЖНУ вправу: частка денної ставки (остання вправа добирає залишок центів)
      const earned = shareOfRate(session.rate, session.exercisesTotal, position);
      session.exercisesDone += 1;
      const dayCompleted = session.exercisesDone >= session.exercisesTotal;
      session.status = dayCompleted ? SessionStatus.COMPLETED : SessionStatus.IN_PROGRESS;
      session.earned = fromCents(toCents(session.earned) + toCents(earned));
      if (dayCompleted) session.completedAt = now;
      await manager.getRepository(DaySession).save(session);

      if (earned > 0) {
        // унікальний частковий індекс: другий earn за ту саму вправу неможливий навіть при гонці
        await manager
          .getRepository(LedgerEntry)
          .createQueryBuilder()
          .insert()
          .values({
            familyId: family.id,
            type: LedgerType.EARN,
            amount: earned,
            currency: family.currency,
            status: LedgerStatus.CONFIRMED,
            sessionId,
            exerciseRecordId: record.id,
          })
          .orIgnore()
          .execute();
      }
      return { session, record, exercise: activeExercise, dayCompleted, earned, created: true };
    });

    if (attempt && outcome.created) {
      await this.attemptLogs.update(attempt.id, { exerciseRecordId: outcome.record.id });
    }
    if (outcome.created) this.emit(family, outcome);
    return {
      accepted: true,
      record: toRecordResponse(
        outcome.record,
        this.exercises.localize(outcome.exercise.name, user.language),
        outcome.exercise.slug,
      ),
      session: toSessionResponse(outcome.session),
      dayCompleted: outcome.dayCompleted,
      earned: outcome.earned,
      // Батько/мати бачить той самий AI-результат одразу, а не лише дитина пізніше через фото сесії
      attempt: attempt
        ? {
            score: attempt.score,
            isCorrect: attempt.isCorrect,
            feedback: attempt.feedback,
            recommendations: attempt.recommendations,
            issues: attempt.issues ?? [],
          }
        : undefined,
    };
  }

  /**
   * Пропуск вправи (не вдалася або AI не зарахував): запис зі `skipped = true`, БЕЗ нарахування. Вправа вважається
   * пройденою — день іде далі (інші вправи доступні в будь-якому порядку) й завершується, коли пройдено всі.
   * Ідемпотентно: повтор для вже виконаної/пропущеної вправи повертає наявний запис.
   */
  async skip(
    user: AuthenticatedUser,
    sessionId: string,
    exerciseId: string,
  ): Promise<CompleteExerciseResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const today = this.clock.localDate(user.timezone);
    const active = await this.programs.getTodayExercises(family.id, today, { family });

    const outcome = await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .getRepository(DaySession)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :sessionId AND s.familyId = :familyId', { sessionId, familyId: family.id })
        .getOne();
      if (!session) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
      const activeExercise = active.find((e) => e.id === exerciseId);
      if (!activeExercise) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);

      const records = manager.getRepository(ExerciseRecord);
      const existing = await records.findOne({ where: { sessionId, exerciseId } });
      if (existing)
        return {
          session,
          record: existing,
          exercise: activeExercise,
          dayCompleted: false,
          earned: 0,
          created: false,
        };

      const open =
        session.status === SessionStatus.PENDING || session.status === SessionStatus.IN_PROGRESS;
      if (session.date !== today || !open)
        throw new AppException(ErrorCode.DAY_ALREADY_CLOSED, HttpStatus.CONFLICT);

      if (active.length > session.exercisesTotal) session.exercisesTotal = active.length;
      if (!session.exerciseIds?.length && active.length > 0)
        session.exerciseIds = active.map((e) => e.id);

      const now = new Date();
      const record = await records.save(
        records.create({
          sessionId,
          exerciseId,
          photoKeys: [],
          steps: null,
          photosExpiresAt: null,
          completedAt: now,
          skipped: true,
        }),
      );
      session.exercisesDone += 1;
      const dayCompleted = session.exercisesDone >= session.exercisesTotal;
      session.status = dayCompleted ? SessionStatus.COMPLETED : SessionStatus.IN_PROGRESS;
      if (dayCompleted) session.completedAt = now;
      await manager.getRepository(DaySession).save(session);
      return { session, record, exercise: activeExercise, dayCompleted, earned: 0, created: true };
    });

    if (outcome.created) {
      this.logger.log({ event: 'exercise_skipped', familyId: family.id, sessionId, exerciseId });
      this.emit(family, outcome);
    }
    return {
      accepted: true,
      record: toRecordResponse(
        outcome.record,
        this.exercises.localize(outcome.exercise.name, user.language),
        outcome.exercise.slug,
      ),
      session: toSessionResponse(outcome.session),
      dayCompleted: outcome.dayCompleted,
      earned: 0,
    };
  }

  /** Події — лише після коміту; помилка слухача не ламає відповідь */
  private emit(
    family: { id: string; childId: string; parentId: string; currency: string },
    o: {
      session: DaySession;
      record: ExerciseRecord;
      exercise: Exercise;
      dayCompleted: boolean;
      earned: number;
    },
  ): void {
    const scope = { familyId: family.id, childId: family.childId, parentId: family.parentId };
    const completed: ExerciseCompletedEvent = {
      ...scope,
      sessionId: o.session.id,
      exerciseId: o.exercise.id,
      exercisesDone: o.session.exercisesDone,
      exercisesTotal: o.session.exercisesTotal,
      hasPhotos: o.record.photoKeys.length > 0,
    };
    this.events.emit(DomainEvent.EXERCISE_COMPLETED, completed);
    if (o.dayCompleted) {
      const day: DayCompletedEvent = {
        ...scope,
        sessionId: o.session.id,
        date: o.session.date,
        // за день загалом (сума часток усіх вправ), а не лише остання частка
        earned: o.session.earned,
        currency: family.currency,
      };
      this.events.emit(DomainEvent.DAY_COMPLETED, day);
      this.logger.log({
        event: 'day_completed',
        familyId: family.id,
        sessionId: o.session.id,
        earned: o.session.earned,
      });
    }
  }
}

function localizeEn(text: Exercise['name']): string {
  return text[AppLanguage.EN] ?? text[AppLanguage.UK];
}

/**
 * Частка денної ставки за вправу на позиції `position` (0-based) із `total`: ставка ділиться порівну в центах,
 * остання вправа отримує залишок — сума за повний день рівно дорівнює ставці (напр. €7.5 / 4 = 1.87×3 + 1.89).
 */
export function shareOfRate(rate: number, total: number, position: number): number {
  const cents = toCents(rate);
  if (total <= 0) return 0;
  const base = Math.floor(cents / total);
  return fromCents(position >= total - 1 ? cents - base * (total - 1) : base);
}

/**
 * Секунди кадрів: від клієнта (коли він їх надіслав і довжина збігається), інакше — рівномірно
 * по тривалості зйомки (середини рівних відрізків).
 */
export function frameTimesFor(
  dto: Pick<CompleteExerciseDto, 'photoKeys' | 'frameTimes'>,
  recordMaxSec: number,
): number[] {
  const n = dto.photoKeys.length;
  if (dto.frameTimes && dto.frameTimes.length === n) return dto.frameTimes;
  return Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) / n) * recordMaxSec));
}
