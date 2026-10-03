import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { SessionStatus } from '../../common/enums';
import { Family } from '../families/entities/family.entity';
import { UserProgramAssignment } from '../programs/entities/user-program-assignment.entity';
import { ProgramsService } from '../programs/programs.service';
import { User } from '../users/entities/user.entity';
import { DayClockService } from './day-clock.service';
import { DaySession } from './entities/day-session.entity';

/** Як далеко в минуле дивимося при закритті днів (захист від довгих циклів після простою) */
const MAX_BACKFILL_DAYS = 120;

/** Життєвий цикл дня (ТЗ §8.1, §8.3). Усе ідемпотентно (unique family+date, `ON CONFLICT DO NOTHING`). */
@Injectable()
export class DaySessionsService {
  private readonly logger = new Logger(DaySessionsService.name);
  /**
   * familyId → локальна дата, за яку минулі дні вже закрито в ЦЬОМУ процесі. Минулі дні після закриття
   * не змінюються (записи створюються лише на «сьогодні»), тож повторно до зміни дати перевіряти нічого —
   * «Сьогодні» не робить цю роботу при кожному відкритті. Кеш лише пришвидшує: cron закриває все й так.
   */
  private readonly closedFor = new Map<string, string>();

  constructor(
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    @InjectRepository(Family) private readonly families: Repository<Family>,
    private readonly clock: DayClockService,
    private readonly programs: ProgramsService,
  ) {}

  /**
   * Запис дня створюється при першому відкритті «Сьогодні», лише якщо день у плані.
   * Фіксує склад вправ (знімок), їх кількість і СТАВКУ на цей момент: зміни плану діють з наступного дня.
   */
  async getOrCreateToday(
    family: Family,
    parent: User,
    /** уже прочитана активна програма (undefined — прочитати) */
    assignment?: UserProgramAssignment | null,
  ): Promise<DaySession | null> {
    const today = this.clock.localDate(parent.timezone);
    const existing = await this.sessions.findOne({ where: { familyId: family.id, date: today } });
    if (existing) return existing;
    if (!family.planDays.includes(this.clock.isoWeekday(today))) return null;

    const todayExercises = await this.programs.computeDayExercises(family, today, assignment);
    await this.sessions
      .createQueryBuilder()
      .insert()
      .values({
        familyId: family.id,
        date: today,
        exercisesTotal: todayExercises.length,
        exerciseIds: todayExercises.map((e) => e.id),
        rate: family.rate,
      })
      .orIgnore()
      .execute();
    return this.sessions.findOneOrFail({ where: { familyId: family.id, date: today } });
  }

  /**
   * Закриває минулі дні однієї сім'ї (ТЗ §8.3):
   *  • запланований день без запису → `missed`;
   *  • `pending`/`in_progress` за минулі дні → `missed` (часткове виконання не оплачується).
   * Повертає кількість змінених/створених записів.
   */
  async closeFamilyPastDays(
    family: Family,
    timezone: string,
    now: Date = new Date(),
    manager?: EntityManager,
  ): Promise<number> {
    const repo = (manager ?? this.sessions.manager).getRepository(DaySession);
    const today = this.clock.localDate(timezone, now);
    // у транзакції (manager) кеш не використовуємо: її можуть відкотити
    if (!manager && this.closedFor.get(family.id) === today) return 0;
    const yesterday = this.clock.addDays(today, -1);
    const createdDate = this.clock.localDateOf(family.createdAt, timezone);
    const from =
      createdDate > this.clock.addDays(today, -MAX_BACKFILL_DAYS)
        ? createdDate
        : this.clock.addDays(today, -MAX_BACKFILL_DAYS);
    if (from > yesterday) return 0;

    const existing = await repo.find({
      where: { familyId: family.id, date: Between(from, yesterday) },
      select: { date: true },
    });
    const known = new Set(existing.map((s) => s.date));
    const missingDates: string[] = [];
    for (let date = from; date <= yesterday; date = this.clock.addDays(date, 1)) {
      if (!known.has(date) && family.planDays.includes(this.clock.isoWeekday(date)))
        missingDates.push(date);
    }
    // Спрощення (як і раніше з countActive()): рахуємо за ПОТОЧНОЮ активною програмою,
    // не за тією, що діяла історично на цю дату. Склад усіх днів — одним набором запитів.
    const byDate = await this.programs.computeDaysExercises(family, missingDates);
    const missing: Array<Partial<DaySession>> = missingDates.map((date) => ({
      familyId: family.id,
      date,
      status: SessionStatus.MISSED,
      exercisesTotal: byDate.get(date)?.length ?? 0,
      rate: family.rate,
    }));
    let inserted = 0;
    if (missing.length > 0) {
      const result = await repo.createQueryBuilder().insert().values(missing).orIgnore().execute();
      inserted = (result.raw as unknown[]).length; // RETURNING лише реально вставлені рядки
    }

    const closed = await repo
      .createQueryBuilder()
      .update()
      .set({ status: SessionStatus.MISSED })
      .where('family_id = :id AND date < :today AND status IN (:...open)', {
        id: family.id,
        today,
        open: [SessionStatus.PENDING, SessionStatus.IN_PROGRESS],
      })
      .execute();
    if (!manager) this.closedFor.set(family.id, today);
    return inserted + (closed.affected ?? 0);
  }

  /** Cron (щогодини): усі сім'ї, кожна за таймзоною свого батька/матері */
  async closePastDays(now: Date = new Date()): Promise<{ families: number; changed: number }> {
    const families = await this.families.find({ relations: { parent: true } });
    let changed = 0;
    for (const family of families) {
      try {
        changed += await this.closeFamilyPastDays(family, family.parent.timezone, now);
      } catch (error) {
        this.logger.error({
          event: 'close_past_days_failed',
          familyId: family.id,
          reason: String(error),
        });
      }
    }
    this.logger.log({ event: 'close_past_days', families: families.length, changed });
    return { families: families.length, changed };
  }
}
