import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { ErrorCode, PLAN } from '../../common/constants';
import { AppLanguage, ExerciseMode, WorkoutType } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { isoWeekdayOf } from '../../common/utils/date.util';
import { progressionFactor } from '../../common/utils/progression.util';
import { AppConfigService } from '../app-config/app-config.service';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Family } from '../families/entities/family.entity';
import { FamilyContextService } from '../families/family-context.service';
import { DaySession } from '../workouts/entities/day-session.entity';
import {
  AssignmentResponseDto,
  CreateProgramDto,
  ProgramResponseDto,
  UpdateProgramDto,
} from './dto';
import { ProgramExercise } from './entities/program-exercise.entity';
import { Program } from './entities/program.entity';
import { UserProgramAssignment } from './entities/user-program-assignment.entity';
import { aiIntensityOf, pickAiDay } from './ai-planner';
import { duplicateAcrossLocales, toAssignmentResponse, toProgramResponse } from './programs.mapper';

/**
 * Незалежні від дати дані для складу дня (див. `loadDayContext`):
 *  • `ai` — увесь активний каталог, склад дня підбирає алгоритм (`ai-planner`);
 *  • `program` — рядки програми (активної або «віртуальної» з відмічених спонсором вправ) і різновиди груп.
 */
type DayContext =
  | { kind: 'ai'; catalog: Exercise[]; maxExercisesPerDay: number }
  | {
      kind: 'program';
      rows: ProgramExercise[];
      siblings: Exercise[];
      maxExercisesPerDay: number;
      manual: boolean;
    };

/** Фасад над Program/ProgramExercise/UserProgramAssignment: дитина керує, обидві ролі читають. */

@Injectable()
export class ProgramsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(ProgramExercise)
    private readonly programExercises: Repository<ProgramExercise>,
    @InjectRepository(UserProgramAssignment)
    private readonly assignments: Repository<UserProgramAssignment>,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    @InjectRepository(Family) private readonly families: Repository<Family>,
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    private readonly context: FamilyContextService,
    private readonly appConfig: AppConfigService,
  ) {}

  async listPresets(language: AppLanguage): Promise<ProgramResponseDto[]> {
    const rows = await this.programs.find({
      where: { isPreset: true, archivedAt: IsNull() },
      relations: { exercises: { exercise: true } },
      order: { createdAt: 'ASC' },
    });
    return rows.map((p) => toProgramResponse(p, language));
  }

  async listMine(userId: string, language: AppLanguage): Promise<ProgramResponseDto[]> {
    const rows = await this.programs.find({
      where: { createdById: userId },
      relations: { exercises: { exercise: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => toProgramResponse(p, language));
  }

  async create(
    userId: string,
    language: AppLanguage,
    dto: CreateProgramDto,
  ): Promise<ProgramResponseDto> {
    await this.assertWithinLimit(dto.exercises.length);
    await this.assertExercisesExist(dto.exercises.map((e) => e.exerciseId));
    const program = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Program).save(
        manager.getRepository(Program).create({
          name: duplicateAcrossLocales(dto.name),
          description: dto.description ? duplicateAcrossLocales(dto.description) : null,
          durationType: dto.durationType,
          isPreset: false,
          createdById: userId,
        }),
      );
      await this.saveExercises(manager.getRepository(ProgramExercise), saved.id, dto.exercises);
      return saved.id;
    });
    return toProgramResponse(await this.findWithExercisesOrFail(program), language);
  }

  async update(
    userId: string,
    language: AppLanguage,
    programId: string,
    dto: UpdateProgramDto,
  ): Promise<ProgramResponseDto> {
    const owned = await this.getOwnEditable(programId, userId);
    await this.assertWithinLimit(dto.exercises.length);
    await this.assertExercisesExist(dto.exercises.map((e) => e.exerciseId));
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Program).update(owned.id, {
        name: duplicateAcrossLocales(dto.name),
        description: dto.description ? duplicateAcrossLocales(dto.description) : null,
        durationType: dto.durationType,
      });
      await manager.getRepository(ProgramExercise).delete({ programId: owned.id });
      await this.saveExercises(manager.getRepository(ProgramExercise), owned.id, dto.exercises);
    });
    return toProgramResponse(await this.findWithExercisesOrFail(owned.id), language);
  }

  /** Лише дитина (@Roles(CHILD) на контролері) — призначає обрану/власну програму СВОЇЙ сім'ї. */
  async assign(user: AuthenticatedUser, programId: string): Promise<AssignmentResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const program = await this.getOwnedOrPreset(programId, user.id);
    const exercisesCount = await this.programExercises.count({ where: { programId: program.id } });
    if (exercisesCount === 0) {
      throw new AppException(ErrorCode.PROGRAM_EXERCISES_EMPTY, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const assignmentId = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UserProgramAssignment);
      await repo.update({ familyId: family.id, isActive: true }, { isActive: false });
      // спонсор явно обрав програму → день складається з неї (вимикаємо підбір ШІ й відмічені вправи)
      await manager
        .getRepository(Family)
        .update(family.id, { exerciseMode: ExerciseMode.MANUAL, selectedExerciseIds: [] });
      const saved = await repo.save(
        repo.create({
          familyId: family.id,
          programId: program.id,
          assignedById: user.id,
          startDate: new Date().toISOString().slice(0, 10),
          isActive: true,
        }),
      );
      return saved.id;
    });
    const assignment = await this.assignments
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.program', 'program')
      .where('a.id = :assignmentId', { assignmentId })
      .getOneOrFail();
    return toAssignmentResponse(assignment, user.language);
  }

  /**
   * Активна програма сім'ї з самою програмою — ОДИН SQL (не `findOne` + relations: той робить `SELECT DISTINCT`
   * + основний запит). Результат можна передати далі (`getTodayExercises`), щоб не читати ще раз.
   */
  activeAssignment(familyId: string): Promise<UserProgramAssignment | null> {
    return this.assignments
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.program', 'program')
      .where('a.family_id = :familyId AND a.is_active', { familyId })
      .getOne();
  }

  async getCurrentAssignment(
    familyId: string,
    language: AppLanguage,
  ): Promise<AssignmentResponseDto | null> {
    const assignment = await this.activeAssignment(familyId);
    return assignment ? toAssignmentResponse(assignment, language) : null;
  }

  /**
   * Вправи дня за активною програмою сім'ї з мерджем override `targetReps`/`targetSeconds`/`targetSteps`
   * поверх базових значень Exercise і множником «Автоускладнення». Немає активної програми → [].
   *
   * Якщо день уже створено зі знімком складу (`day_sessions.exercise_ids`), повертається САМЕ цей склад:
   * зміни плану, видів навантаження, часу чи програми діють з наступного дня й не зсувають позиції вправ.
   * Форма повернених елементів СУМІСНА з `Exercise` (спред + перезапис цілей).
   */
  async getTodayExercises(
    familyId: string,
    date: string,
    /** Уже завантажені дані (екран «Сьогодні»): щоб не читати сім'ю/день/програму вдруге */
    known: {
      family?: Family;
      session?: Pick<DaySession, 'exerciseIds'> | null;
      assignment?: UserProgramAssignment | null;
    } = {},
  ): Promise<Exercise[]> {
    const [family, session, assignment] = await Promise.all([
      known.family ?? this.families.findOne({ where: { id: familyId } }),
      known.session !== undefined
        ? known.session
        : this.sessions.findOne({
            where: { familyId, date },
            select: { id: true, exerciseIds: true },
          }),
      known.assignment !== undefined ? known.assignment : this.activeAssignment(familyId),
    ]);
    if (!family) return [];
    if (session?.exerciseIds?.length)
      return this.snapshotExercises(family, date, session.exerciseIds, assignment);
    return this.computeDayExercises(family, date, assignment);
  }

  /**
   * «Живий» склад дня (для створення знімка): вправи програми на цей день тижня →
   * фільтр «Види навантаження» (якщо відсіює все — фільтр ігнорується, день не лишається порожнім) →
   * чергування різновидів (вправа з групою → різновид групи на цей день) →
   * бюджет «Час тренування» (ходьба в бюджет не входить; перша вправа — завжди) → ліміт вправ на день
   * з CRM → цілі з автоускладненням.
   */
  async computeDayExercises(
    family: Family,
    date: string,
    /** undefined — прочитати; null — програми немає */
    knownAssignment?: UserProgramAssignment | null,
  ): Promise<Exercise[]> {
    const ctx = await this.loadDayContext(family, knownAssignment);
    return ctx ? this.pickDay(ctx, family, date) : [];
  }

  /**
   * Склад кількох днів за один набір запитів (закриття пропущених днів: раніше — 3–4 SQL на КОЖЕН день,
   * до 120 днів поспіль під час відкриття «Сьогодні»).
   */
  async computeDaysExercises(family: Family, dates: string[]): Promise<Map<string, Exercise[]>> {
    const result = new Map<string, Exercise[]>();
    if (dates.length === 0) return result;
    const ctx = await this.loadDayContext(family);
    for (const date of dates) result.set(date, ctx ? this.pickDay(ctx, family, date) : []);
    return result;
  }

  /**
   * Усе, що потрібно для складу дня, окрім самої дати. Джерело вправ за режимом сім'ї:
   * ШІ (за замовчуванням) → увесь активний каталог; «вручну» → відмічені спонсором вправи, а якщо їх немає —
   * активна програма (як раніше).
   */
  private async loadDayContext(
    family: Family,
    knownAssignment?: UserProgramAssignment | null,
  ): Promise<DayContext | null> {
    const limits = await this.appConfig.limits();
    if (family.exerciseMode === ExerciseMode.AI) {
      const catalog = await this.exercises.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', slug: 'ASC' },
      });
      return { kind: 'ai', catalog, maxExercisesPerDay: limits.maxExercisesPerDay };
    }

    const selected = family.selectedExerciseIds ?? [];
    if (selected.length > 0) {
      const chosen = await this.exercises.find({ where: { id: In(selected), isActive: true } });
      // «віртуальна програма» в порядку відмічання; усі дні плану; цілі — базові з каталогу
      const rows = selected
        .map((id) => chosen.find((e) => e.id === id))
        .filter((e): e is Exercise => e !== undefined)
        .map((exercise, index) =>
          this.programExercises.create({
            exerciseId: exercise.id,
            exercise,
            sortOrder: index + 1,
            targetReps: null,
            targetSeconds: null,
            targetSteps: null,
            planDays: [1, 2, 3, 4, 5, 6, 7],
          }),
        );
      if (rows.length > 0)
        return {
          kind: 'program',
          rows,
          siblings: [],
          maxExercisesPerDay: limits.maxExercisesPerDay,
          manual: true,
        };
    }

    const assignment =
      knownAssignment !== undefined
        ? knownAssignment
        : await this.assignments.findOne({ where: { familyId: family.id, isActive: true } });
    if (!assignment) return null;
    const rows = await this.programExercises
      .createQueryBuilder('pe')
      .innerJoinAndSelect('pe.exercise', 'exercise')
      .where('pe.program_id = :programId', { programId: assignment.programId })
      // вимкнені вправи (без демо-ролика) у день не потрапляють, навіть якщо є в старій програмі
      .andWhere('exercise.is_active')
      .orderBy('pe.sort_order', 'ASC')
      .getMany();
    const groups = [
      ...new Set(rows.map((r) => r.exercise.variantGroup).filter((g): g is string => !!g)),
    ];
    const siblings = groups.length
      ? await this.exercises.find({
          where: { variantGroup: In(groups), isActive: true },
          order: { sortOrder: 'ASC', slug: 'ASC' },
        })
      : [];
    return {
      kind: 'program',
      rows,
      siblings,
      maxExercisesPerDay: limits.maxExercisesPerDay,
      manual: false,
    };
  }

  /** Склад дня береться з активної програми (режим «вручну» без відмічених вправ) */
  usesProgram(family: Pick<Family, 'exerciseMode' | 'selectedExerciseIds'>): boolean {
    return (
      family.exerciseMode !== ExerciseMode.AI && (family.selectedExerciseIds ?? []).length === 0
    );
  }

  /** Множник цілей дня: «Автоускладнення» × (у режимі ШІ) хвиля навантаження */
  private dayFactor(family: Family, date: string): number {
    const base = progressionFactor(family, date);
    return family.exerciseMode === ExerciseMode.AI
      ? base * aiIntensityOf(family.planDays, date)
      : base;
  }

  /** Чиста функція: склад конкретного дня з уже завантаженого контексту (без запитів до БД) */
  private pickDay(ctx: DayContext, family: Family, date: string): Exercise[] {
    if (ctx.kind === 'ai') {
      const factor = this.dayFactor(family, date);
      return pickAiDay(ctx.catalog, date, {
        planDays: family.planDays,
        workoutMinutes: family.workoutMinutes ?? PLAN.DEFAULT_WORKOUT_MINUTES,
        maxExercises: ctx.maxExercisesPerDay,
      }).map((e) => this.withTargets(e, null, factor));
    }
    const weekday = isoWeekdayOf(date);
    const planned = ctx.rows.filter((r) => r.planDays.includes(weekday));
    // відмічені спонсором вправи, що не вміщаються в один день, чергуються: щодня список починається з іншої
    const ofDay = ctx.manual ? this.rotateStart(planned, date) : planned;

    const allowed = new Set(family.workoutTypes ?? []);
    // явно відмічені спонсором вправи не фільтруються «видами навантаження»
    const byType = ctx.manual
      ? ofDay
      : ofDay.filter(
          (r) =>
            (r.exercise.workoutTypes ?? []).length === 0 ||
            r.exercise.workoutTypes.some((t) => allowed.has(t)),
        );
    const typed = byType.length > 0 ? byType : ofDay;
    const varied = this.rotateVariants(typed, ctx.siblings, date);

    const budget = family.workoutMinutes ?? PLAN.DEFAULT_WORKOUT_MINUTES;
    let used = 0;
    let timed = 0;
    const fitted = varied.filter(({ row, exercise }) => {
      if (this.isWalking(exercise, exercise.id === row.exerciseId ? row.targetSteps : null))
        return true;
      const minutes = exercise.durationMin ?? 0;
      if (timed > 0 && used + minutes > budget) return false;
      used += minutes;
      timed += 1;
      return true;
    });

    const factor = this.dayFactor(family, date);
    return fitted.slice(0, ctx.maxExercisesPerDay).map(({ row, exercise }) =>
      // override цілей програми — лише для тієї самої вправи; різновид іде зі своїми базовими цілями
      this.withTargets(exercise, exercise.id === row.exerciseId ? row : null, factor),
    );
  }

  /** Зсув початку списку на номер дня (кожен день — з наступної вправи), порядок по колу зберігається */
  private rotateStart<T>(rows: T[], date: string): T[] {
    if (rows.length <= 1) return rows;
    const dayIndex = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
    const start = ((dayIndex % rows.length) + rows.length) % rows.length;
    return [...rows.slice(start), ...rows.slice(0, start)];
  }

  /**
   * Чергування різновидів: для рядка програми, чия вправа має `variantGroup`, береться активна вправа групи
   * за номером дня (день у день — наступний різновид). Порядок групи — за sortOrder; в один день різновид
   * не повторюється (два рядки однієї групи отримають різні вправи). Вправи без групи лишаються як є.
   */
  private rotateVariants(
    rows: ProgramExercise[],
    siblings: Exercise[],
    date: string,
  ): { row: ProgramExercise; exercise: Exercise }[] {
    if (!rows.some((r) => r.exercise.variantGroup))
      return rows.map((row) => ({ row, exercise: row.exercise }));

    const dayIndex = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
    const taken = new Set(rows.filter((r) => !r.exercise.variantGroup).map((r) => r.exerciseId));

    return rows.map((row) => {
      const group = row.exercise.variantGroup;
      const list = group ? siblings.filter((e) => e.variantGroup === group) : [];
      if (list.length <= 1) {
        taken.add(row.exerciseId);
        return { row, exercise: row.exercise };
      }
      const start = Math.max(
        0,
        list.findIndex((e) => e.id === row.exerciseId),
      );
      for (let k = 0; k < list.length; k += 1) {
        const candidate = list[(start + dayIndex + k) % list.length];
        if (!taken.has(candidate.id)) {
          taken.add(candidate.id);
          return { row, exercise: candidate };
        }
      }
      return { row, exercise: row.exercise };
    });
  }

  /** Склад зі знімка: вправи в збереженому порядку; цілі — з рядків поточної програми (якщо вправа там є) */
  private async snapshotExercises(
    family: Family,
    date: string,
    ids: string[],
    knownAssignment?: UserProgramAssignment | null,
  ): Promise<Exercise[]> {
    const assignment =
      knownAssignment !== undefined
        ? knownAssignment
        : await this.assignments.findOne({ where: { familyId: family.id, isActive: true } });
    // вправи зі знімка й рядки програми — паралельно
    const [catalog, rows] = await Promise.all([
      this.exercises.find({ where: { id: In(ids) } }),
      // override цілей з програми — лише коли день справді складено з програми (не ШІ й не відмічені вправи)
      assignment && this.usesProgram(family)
        ? this.programExercises.find({ where: { programId: assignment.programId } })
        : Promise.resolve([] as ProgramExercise[]),
    ]);
    const factor = this.dayFactor(family, date);
    return ids
      .map((id) => catalog.find((e) => e.id === id))
      .filter((e): e is Exercise => e !== undefined)
      .map((e) => this.withTargets(e, rows.find((r) => r.exerciseId === e.id) ?? null, factor));
  }

  /** Override програми + множник автоускладнення (повтори — цілі; секунди — крок 5; кроки — крок 50) */
  private withTargets(
    exercise: Exercise,
    row: Pick<ProgramExercise, 'targetReps' | 'targetSeconds' | 'targetSteps'> | null,
    factor: number,
  ): Exercise {
    const reps = row?.targetReps ?? exercise.targetReps;
    const seconds = row?.targetSeconds ?? exercise.targetSeconds;
    const steps = row?.targetSteps ?? exercise.targetSteps;
    const scaledSeconds =
      seconds === null ? null : Math.min(120, Math.max(5, Math.round((seconds * factor) / 5) * 5));
    return {
      ...exercise,
      targetReps: reps === null ? null : Math.max(1, Math.round(reps * factor)),
      targetSeconds: scaledSeconds,
      targetSteps: steps === null ? null : Math.max(50, Math.round((steps * factor) / 50) * 50),
      // зйомка вправи на час має тривати не менше за саму ціль
      recordMaxSec:
        scaledSeconds === null
          ? exercise.recordMaxSec
          : Math.max(exercise.recordMaxSec, scaledSeconds),
    };
  }

  private isWalking(exercise: Exercise, stepsOverride: number | null): boolean {
    return (
      (stepsOverride ?? exercise.targetSteps) !== null ||
      (exercise.workoutTypes ?? []).includes(WorkoutType.WALKING)
    );
  }

  private async getOwnedOrPreset(programId: string, userId: string): Promise<Program> {
    const program = await this.programs.findOne({ where: { id: programId } });
    if (!program) throw new AppException(ErrorCode.PROGRAM_NOT_FOUND, HttpStatus.NOT_FOUND);
    if (!program.isPreset && program.createdById !== userId) {
      throw new AppException(ErrorCode.PROGRAM_NOT_OWNED, HttpStatus.FORBIDDEN);
    }
    return program;
  }

  /** Лише власні (не preset) програми можна редагувати. */
  private async getOwnEditable(programId: string, userId: string): Promise<Program> {
    const program = await this.programs.findOne({ where: { id: programId } });
    if (!program) throw new AppException(ErrorCode.PROGRAM_NOT_FOUND, HttpStatus.NOT_FOUND);
    if (program.isPreset || program.createdById !== userId) {
      throw new AppException(ErrorCode.PROGRAM_NOT_OWNED, HttpStatus.FORBIDDEN);
    }
    return program;
  }

  private findWithExercisesOrFail(id: string): Promise<Program> {
    return this.programs.findOneOrFail({
      where: { id },
      relations: { exercises: { exercise: true } },
    });
  }

  /** Ліміт вправ у програмі з CRM — діє і для ручного добору дитиною */
  private async assertWithinLimit(count: number): Promise<void> {
    const { maxProgramExercises } = await this.appConfig.limits();
    if (count > maxProgramExercises) {
      throw new AppException(
        ErrorCode.PROGRAM_TOO_MANY_EXERCISES,
        HttpStatus.UNPROCESSABLE_ENTITY,
        `Max ${maxProgramExercises} exercises per program`,
      );
    }
  }

  private async assertExercisesExist(exerciseIds: string[]): Promise<void> {
    const unique = [...new Set(exerciseIds)];
    const found = await this.exercises.count({ where: { id: In(unique) } });
    if (found !== unique.length) {
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, 'Exercise not found');
    }
  }

  private async saveExercises(
    repo: Repository<ProgramExercise>,
    programId: string,
    exercises: CreateProgramDto['exercises'],
  ): Promise<void> {
    await repo.save(
      exercises.map((e, index) =>
        repo.create({
          programId,
          exerciseId: e.exerciseId,
          sortOrder: index + 1,
          targetReps: e.targetReps ?? null,
          targetSeconds: e.targetSeconds ?? null,
          targetSteps: e.targetSteps ?? null,
          planDays: e.planDays,
        }),
      ),
    );
  }
}
