import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Between, DataSource, Repository } from 'typeorm';
import { SessionStatus } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { FamilyContextService } from '../families/family-context.service';
import { DayClockService } from '../workouts/day-clock.service';
import { DaySession } from '../workouts/entities/day-session.entity';
import {
  ActivityBucketDto,
  ActivityPeriod,
  ActivityResponseDto,
  DayStepsDto,
} from './dto/activity.dto';
import { DailySteps } from './entities/daily-steps.entity';

interface Range {
  from: string;
  to: string;
}

/**
 * Графік «Кроки і тренування» (макет, таб «Прогрес»): кроки батька/матері (daily_steps) і дні тренувань
 * (day_sessions) за період, розбиті на відрізки. Аналітику «стали активніші на X%» рахує клієнт із цих даних.
 */
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(DailySteps) private readonly steps: Repository<DailySteps>,
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly context: FamilyContextService,
    private readonly clock: DayClockService,
  ) {}

  /** Підсумки кроків за дні: значення за день лише зростає (телефон може надіслати проміжне) */
  async syncSteps(userId: string, days: DayStepsDto[]): Promise<void> {
    for (const day of days) {
      await this.dataSource.query(
        `INSERT INTO daily_steps (user_id, date, steps) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date)
         DO UPDATE SET steps = GREATEST(daily_steps.steps, EXCLUDED.steps), updated_at = now()`,
        [userId, day.date, day.steps],
      );
    }
  }

  async getActivity(user: AuthenticatedUser, period: ActivityPeriod): Promise<ActivityResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const tz = family.parent.timezone;
    const today = this.clock.localDate(tz);
    const since = this.clock.localDateOf(family.createdAt, tz);
    const { granularity, ranges } = bucketsFor(period, today, since);
    const from = ranges[0].from;

    const [stepRows, sessionRows] = await Promise.all([
      this.steps.find({
        where: { userId: family.parentId, date: Between(from, today) },
        select: { date: true, steps: true },
      }),
      this.sessions.find({
        where: { familyId: family.id, date: Between(from, today) },
        select: { date: true, status: true },
      }),
    ]);

    const buckets: ActivityBucketDto[] = ranges.map(({ from: a, to: b }) => {
      const inRange = (date: string) => date >= a && date <= b;
      const days = stepRows.filter((r) => inRange(r.date));
      const sessions = sessionRows.filter((r) => inRange(r.date));
      return {
        from: a,
        to: b,
        steps: days.length
          ? Math.round(days.reduce((sum, d) => sum + d.steps, 0) / days.length)
          : 0,
        workouts: sessions.filter((s) => s.status === SessionStatus.COMPLETED).length,
        planned: sessions.length,
      };
    });
    return { period, granularity, buckets };
  }
}

/** Відрізки періоду, що закінчуються сьогодні. «Весь час» — помісячно від створення сім'ї (мало даних — потижнево). */
export function bucketsFor(
  period: ActivityPeriod,
  today: string,
  since: string,
): { granularity: ActivityResponseDto['granularity']; ranges: Range[] } {
  const end = DateTime.fromISO(today, { zone: 'utc' });
  const iso = (d: DateTime) => d.toISODate() ?? '';
  const days = (count: number): Range[] =>
    Array.from({ length: count }, (_, i) => {
      const d = end.minus({ days: count - 1 - i });
      return { from: iso(d), to: iso(d) };
    });
  const weeks = (count: number): Range[] =>
    Array.from({ length: count }, (_, i) => {
      const to = end.minus({ weeks: count - 1 - i });
      return { from: iso(to.minus({ days: 6 })), to: iso(to) };
    });
  const months = (count: number): Range[] =>
    Array.from({ length: count }, (_, i) => {
      const start = end.startOf('month').minus({ months: count - 1 - i });
      const last = start.endOf('month');
      return { from: iso(start), to: iso(last < end ? last : end) };
    });

  switch (period) {
    case '7':
      return { granularity: 'day', ranges: days(7) };
    case '30':
      return { granularity: 'day', ranges: days(30) };
    case '90':
      return { granularity: 'week', ranges: weeks(13) };
    case '180':
      return { granularity: 'month', ranges: months(6) };
    case '365':
      return { granularity: 'month', ranges: months(12) };
    case 'all': {
      const start = DateTime.fromISO(since, { zone: 'utc' });
      const monthCount =
        Math.floor(end.startOf('month').diff(start.startOf('month'), 'months').months) + 1;
      if (monthCount >= 3)
        return { granularity: 'month', ranges: months(Math.min(monthCount, 36)) };
      const weekCount = Math.max(2, Math.ceil(end.diff(start, 'days').days / 7) + 1);
      return { granularity: 'week', ranges: weeks(Math.min(weekCount, 13)) };
    }
  }
}
