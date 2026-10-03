import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarDayStatus, SessionStatus } from '../../common/enums';
import { daysInMonth } from '../../common/utils/date.util';
import { Family } from '../families/entities/family.entity';
import { ProgramsService } from '../programs/programs.service';
import { DayClockService } from './day-clock.service';
import { CalendarResponseDto } from './dto';
import { DaySession } from './entities/day-session.entity';

/**
 * Календар місяця: completed / missed / in_progress / pending (сьогодні) / planned (попереду) / rest.
 * Минулі дні без запису = не були в плані (пропущені створює closePastDays).
 */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    private readonly clock: DayClockService,
    private readonly programs: ProgramsService,
  ) {}

  async getMonth(family: Family, month: string, timezone: string): Promise<CalendarResponseDto> {
    const dates = daysInMonth(month);
    const today = this.clock.localDate(timezone);
    const rows = await this.sessions
      .createQueryBuilder('s')
      .where('s.familyId = :id AND s.date BETWEEN :from AND :to', {
        id: family.id,
        from: dates[0],
        to: dates[dates.length - 1],
      })
      .getMany();
    const byDate = new Map(rows.map((s) => [s.date, s]));
    // Спрощення (як і раніше з countActive()): один орієнтовний total за поточною активною програмою
    // для ВСІХ запланованих днів місяця, не за програмою, що діяла історично на кожну конкретну дату.
    const activeCount = (
      await this.programs.getTodayExercises(family.id, today, {
        family,
        // рядок дня вже прочитано вище, якщо «сьогодні» входить у місяць
        session: dates.includes(today) ? (byDate.get(today) ?? null) : undefined,
      })
    ).length;

    const days = dates.map((date) => {
      const session = byDate.get(date);
      const planned = family.planDays.includes(this.clock.isoWeekday(date));
      return {
        date,
        status: this.statusOf(date, today, session, planned),
        exercisesDone: session?.exercisesDone ?? 0,
        exercisesTotal: session?.exercisesTotal ?? (planned ? activeCount : 0),
      };
    });
    return { month, todayDate: today, days };
  }

  private statusOf(
    date: string,
    today: string,
    session: DaySession | undefined,
    planned: boolean,
  ): CalendarDayStatus {
    if (session) {
      if (session.status === SessionStatus.COMPLETED) return CalendarDayStatus.COMPLETED;
      if (session.status === SessionStatus.MISSED || date < today) return CalendarDayStatus.MISSED;
      return session.status === SessionStatus.IN_PROGRESS
        ? CalendarDayStatus.IN_PROGRESS
        : CalendarDayStatus.PENDING;
    }
    if (date < today) return CalendarDayStatus.REST;
    if (date === today) return planned ? CalendarDayStatus.PENDING : CalendarDayStatus.REST;
    return planned ? CalendarDayStatus.PLANNED : CalendarDayStatus.REST;
  }
}
