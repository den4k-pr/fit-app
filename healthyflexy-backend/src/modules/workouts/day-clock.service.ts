import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { addDaysIso, isoWeekdayOf } from '../../common/utils/date.util';

/**
 * Локальний час (luxon). БД зберігає UTC, але «день» рахується за timezone батька/матері (ТЗ §8.8).
 * Дата дня — рядок `YYYY-MM-DD` без часу.
 */
@Injectable()
export class DayClockService {
  localDate(timezone: string, now: Date = new Date()): string {
    return DateTime.fromJSDate(now, { zone: timezone }).toISODate() ?? '';
  }

  isoWeekday(date: string): number {
    return isoWeekdayOf(date);
  }

  addDays(date: string, days: number): string {
    return addDaysIso(date, days);
  }

  /** Найближчий запланований день ПІСЛЯ `fromDate` */
  nextPlanDate(planDays: number[], fromDate: string): string | null {
    for (let i = 1; i <= 7; i += 1) {
      const date = addDaysIso(fromDate, i);
      if (planDays.includes(isoWeekdayOf(date))) return date;
    }
    return null;
  }

  /** Локальна дата, у якій було створено момент `at` (для дати створення сім'ї) */
  localDateOf(at: Date, timezone: string): string {
    return this.localDate(timezone, at);
  }
}
