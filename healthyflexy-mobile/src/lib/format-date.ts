import { addDays, format, parseISO } from 'date-fns';
import { enUS, pl, ru, uk } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { AppLanguage, type ISODate, type YearMonth } from '@/types';

const LOCALES: Record<AppLanguage, Locale> = {
  [AppLanguage.Uk]: uk,
  [AppLanguage.Ru]: ru,
  [AppLanguage.Pl]: pl,
  [AppLanguage.En]: enUS,
};

export const dateLocale = (language: AppLanguage): Locale => LOCALES[language];
export const intlLocale = (language: AppLanguage): string => language;

/** «субота, 19 вересня» */
export function formatLongDate(date: ISODate, language: AppLanguage): string {
  return format(parseISO(date), 'EEEE, d MMMM', { locale: dateLocale(language) });
}

/** «Вт, 15 вер» */
export function formatShortDate(date: ISODate, language: AppLanguage): string {
  return format(parseISO(date), 'EEE, d LLL', { locale: dateLocale(language) });
}

/** «середа» */
export function formatWeekday(date: ISODate, language: AppLanguage): string {
  return format(parseISO(date), 'EEEE', { locale: dateLocale(language) });
}

/** Назви днів тижня Пн…Нд (за порядком ISO 1–7): короткі («Пн») або повні («Понеділок») */
export function weekdayNames(language: AppLanguage, style: 'short' | 'long'): string[] {
  const monday = parseISO('2024-01-01'); // понеділок
  return Array.from({ length: 7 }, (_, i) => {
    const name = format(addDays(monday, i), style === 'short' ? 'EEEEEE' : 'EEEE', { locale: dateLocale(language) });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

/** «вересень 2026» */
export function formatMonthTitle(month: YearMonth, language: AppLanguage): string {
  return format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: dateLocale(language) });
}

/** «09:24» з ISO-часу */
export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

/** «Сьогодні, 09:24» / «Вчора, 10:11» / «Пт, 12 вер, 09:05» */
export function formatWhen(
  iso: string,
  today: ISODate,
  language: AppLanguage,
  labels: { today: string; yesterday: string },
): string {
  const day = format(parseISO(iso), 'yyyy-MM-dd');
  const time = formatTime(iso);
  if (day === today) return `${labels.today}, ${time}`;
  if (day === format(addDays(parseISO(today), -1), 'yyyy-MM-dd')) return `${labels.yesterday}, ${time}`;
  return `${formatShortDate(day, language)}, ${time}`;
}

export type DayPart = 'morning' | 'day' | 'evening';

/** ТЗ §6.2: 05:00–11:59 ранок, 12:00–17:59 день, 18:00–04:59 вечір */
export function dayPartOf(date: Date): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  return 'evening';
}
