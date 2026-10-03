import { addDays, format, getISODay, parseISO } from 'date-fns';
import type { ISODate } from '@/types';

/** Локальна дата пристрою `YYYY-MM-DD` */
export const toIsoDate = (date: Date): ISODate => format(date, 'yyyy-MM-dd');

/** ISO-день тижня: 1 = Пн … 7 = Нд */
export const isoWeekdayOf = (date: ISODate): number => getISODay(parseISO(date));

/** Дата ± днів у форматі `YYYY-MM-DD` */
export const addDaysIso = (date: ISODate, days: number): ISODate => format(addDays(parseISO(date), days), 'yyyy-MM-dd');
