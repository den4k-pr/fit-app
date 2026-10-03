import { DateTime } from 'luxon';

/** Усі дати місяця `YYYY-MM` по порядку */
export function daysInMonth(month: string): string[] {
  const first = DateTime.fromISO(`${month}-01`, { zone: 'utc' });
  return Array.from(
    { length: first.daysInMonth ?? 0 },
    (_, i) => first.plus({ days: i }).toISODate() ?? '',
  );
}

export const addDaysIso = (date: string, days: number): string =>
  DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate() ?? date;

/** ISO-день тижня дати без часу: 1 = Пн … 7 = Нд */
export const isoWeekdayOf = (date: string): number =>
  DateTime.fromISO(date, { zone: 'utc' }).weekday;

/** «10:00:00» → «10:00» (PostgreSQL time віддає секунди) */
export const formatHHmm = (time: string): string => time.slice(0, 5);
