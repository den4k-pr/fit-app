import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Or, Repository } from 'typeorm';
import { ErrorCode, REMINDER } from '../../common/constants';
import { ParentDayState, SessionStatus } from '../../common/enums';
import {
  DomainEvent,
  PlanUpdatedEvent,
  ReminderRequestedEvent,
} from '../../common/events/domain-events';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProgramsService } from '../programs/programs.service';
import { DayClockService } from '../workouts/day-clock.service';
import { DaySession } from '../workouts/entities/day-session.entity';
import { StatsService } from '../workouts/stats.service';
import {
  FamilyResponseDto,
  FamilyStatsResponseDto,
  ParentStatusResponseDto,
  ReminderResponseDto,
  UpdateFamilyDto,
  UpdatePlanDto,
} from './dto';
import { Family } from './entities/family.entity';
import { FamilyContextService } from './family-context.service';
import { toFamilyResponse } from './families.mapper';
import { UsersService } from '../users/users.service';

@Injectable()
export class FamiliesService {
  constructor(
    @InjectRepository(Family) private readonly families: Repository<Family>,
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    private readonly context: FamilyContextService,
    private readonly stats: StatsService,
    private readonly clock: DayClockService,
    private readonly programs: ProgramsService,
    private readonly users: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  /** Сім'я очима користувача: з аватаром другої сторони й рівнем автоускладнення */
  async toResponse(family: Family, userId: string): Promise<FamilyResponseDto> {
    const other = family.parentId === userId ? family.child : family.parent;
    return toFamilyResponse(family, userId, {
      counterpartAvatarUrl: await this.users.avatarUrlOf(other),
      today: this.clock.localDate(family.parent.timezone),
    });
  }

  async getCurrent(user: AuthenticatedUser): Promise<FamilyResponseDto> {
    return this.toResponse(await this.context.requireFamilyFor(user.id), user.id);
  }

  /** Усі сім'ї користувача: у дитини — перемикач батьків («👵 Мама · 👴 Тато · +») */
  async list(user: AuthenticatedUser): Promise<FamilyResponseDto[]> {
    const families = await this.context.listFamiliesFor(user.id);
    return Promise.all(families.map((f) => this.toResponse(f, user.id)));
  }

  /** Дитина перейменовує батька/матір у перемикачі («Мама» → «Бабуся Олена») */
  async rename(user: AuthenticatedUser, dto: UpdateFamilyDto): Promise<FamilyResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    family.parentLabel = dto.parentLabel.trim();
    await this.families.save(family);
    return this.toResponse(family, user.id);
  }

  /**
   * План змінює дитина. Зміни діють З НАСТУПНОГО ДНЯ: сьогоднішній день (а вона могла ще не відкрити «Сьогодні»)
   * спершу фіксується зі старою ставкою, лише потім застосовується новий план.
   */
  async updatePlan(user: AuthenticatedUser, dto: UpdatePlanDto): Promise<FamilyResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    await this.freezeToday(family);

    if (dto.planDays) family.planDays = [...dto.planDays].sort((a, b) => a - b);
    if (dto.rate !== undefined) family.rate = dto.rate;
    if (dto.currency) family.currency = dto.currency;
    if (dto.reminderTime) family.reminderTime = dto.reminderTime;
    if (dto.workoutTypes) family.workoutTypes = [...new Set(dto.workoutTypes)];
    if (dto.workoutMinutes !== undefined) family.workoutMinutes = dto.workoutMinutes;
    if (dto.progressionPct !== undefined) family.progressionPct = dto.progressionPct;
    if (dto.exerciseMode) family.exerciseMode = dto.exerciseMode;
    if (dto.selectedExerciseIds) {
      await this.assertExercisesActive(dto.selectedExerciseIds);
      family.selectedExerciseIds = [...new Set(dto.selectedExerciseIds)];
    }
    if (dto.autoProgression !== undefined && dto.autoProgression !== family.autoProgression) {
      family.autoProgression = dto.autoProgression;
      // тижні зростання рахуються від дня ввімкнення; вимкнення скидає цілі до базових
      family.progressionStartDate = dto.autoProgression
        ? this.clock.localDate(family.parent.timezone)
        : null;
    }
    await this.families.save(family);

    const payload: PlanUpdatedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
    };
    this.events.emit(DomainEvent.PLAN_UPDATED, payload);
    return this.toResponse(family, user.id);
  }

  /** Відмічати можна лише активні вправи каталогу (чужий/неіснуючий id → 404) */
  private async assertExercisesActive(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const found = await this.exercises.count({ where: { id: In(unique), isActive: true } });
    if (found !== unique.length)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, 'Exercise not found');
  }

  async getStats(user: AuthenticatedUser): Promise<FamilyStatsResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    return this.stats.getFamilyStats(family, this.clock.localDate(family.parent.timezone));
  }

  /** Стан батька/матері «сьогодні» для дашборда дитини + чи можна нагадати */
  async getParentStatus(user: AuthenticatedUser): Promise<ParentStatusResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const state = await this.dayState(family);
    const today = this.clock.localDate(family.parent.timezone);
    const session = await this.sessions.findOne({ where: { familyId: family.id, date: today } });
    const last = await this.sessions.findOne({
      where: { familyId: family.id, status: SessionStatus.COMPLETED },
      order: { date: 'DESC' },
      select: { date: true },
    });

    const nextAllowed = family.lastReminderSentAt
      ? new Date(family.lastReminderSentAt.getTime() + REMINDER.COOLDOWN_HOURS * 3600_000)
      : null;
    const cooling = nextAllowed !== null && nextAllowed > new Date();
    const remindable = state === ParentDayState.NOT_STARTED || state === ParentDayState.IN_PROGRESS;

    return {
      state,
      parentName: family.parent.name,
      parentLabel: family.parentLabel,
      parentAvatarUrl: await this.users.avatarUrlOf(family.parent),
      localDate: today,
      exercisesDone: session?.exercisesDone ?? 0,
      exercisesTotal:
        session?.exercisesTotal ??
        (await this.programs.getTodayExercises(family.id, today, { family })).length,
      lastCompletedDate: last?.date ?? null,
      canRemind: remindable && !cooling && this.parentCanReceivePush(family),
      nextReminderAllowedAt: cooling ? nextAllowed : null,
    };
  }

  /** Нагадування дитини: не частіше ніж раз на 2 години (атомарно в SQL) */
  async sendReminder(user: AuthenticatedUser): Promise<ReminderResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const state = await this.dayState(family);
    if (state === ParentDayState.COMPLETED || state === ParentDayState.REST_DAY) {
      throw new AppException(ErrorCode.REMINDER_NOT_ALLOWED, HttpStatus.CONFLICT);
    }
    if (!this.parentCanReceivePush(family))
      throw new AppException(ErrorCode.PARENT_HAS_NO_PUSH, HttpStatus.CONFLICT);

    const sentAt = new Date();
    const threshold = new Date(sentAt.getTime() - REMINDER.COOLDOWN_HOURS * 3600_000);
    const result = await this.families.update(
      { id: family.id, lastReminderSentAt: Or(IsNull(), LessThan(threshold)) },
      { lastReminderSentAt: sentAt },
    );
    if (!result.affected)
      throw new AppException(ErrorCode.REMINDER_TOO_SOON, HttpStatus.TOO_MANY_REQUESTS);

    const payload: ReminderRequestedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
      requestedByUserId: user.id,
    };
    this.events.emit(DomainEvent.REMINDER_REQUESTED, payload);
    return {
      sentAt,
      nextAllowedAt: new Date(sentAt.getTime() + REMINDER.COOLDOWN_HOURS * 3600_000),
    };
  }

  private parentCanReceivePush(family: Family): boolean {
    return family.parent.pushEnabled && !!family.parent.pushToken;
  }

  private async dayState(family: Family): Promise<ParentDayState> {
    const today = this.clock.localDate(family.parent.timezone);
    const session = await this.sessions.findOne({ where: { familyId: family.id, date: today } });
    if (session?.status === SessionStatus.COMPLETED) return ParentDayState.COMPLETED;
    if (session?.status === SessionStatus.IN_PROGRESS && session.exercisesDone > 0)
      return ParentDayState.IN_PROGRESS;
    if (session || family.planDays.includes(this.clock.isoWeekday(today)))
      return ParentDayState.NOT_STARTED;
    return ParentDayState.REST_DAY;
  }

  /** Створює сьогоднішній день зі старою ставкою, якщо він у плані й ще не створений */
  private async freezeToday(family: Family): Promise<void> {
    const today = this.clock.localDate(family.parent.timezone);
    if (!family.planDays.includes(this.clock.isoWeekday(today))) return;
    const exercises = await this.programs.computeDayExercises(family, today);
    await this.sessions
      .createQueryBuilder()
      .insert()
      .values({
        familyId: family.id,
        date: today,
        exercisesTotal: exercises.length,
        exerciseIds: exercises.map((e) => e.id),
        rate: family.rate,
      })
      .orIgnore()
      .execute();
  }
}
