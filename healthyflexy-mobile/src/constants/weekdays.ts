import type { IsoWeekday } from '@/types';

/** Порядок показу: Пн … Нд (ISO 1–7) */
export const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** ISO-день з JS Date: getDay() 0 = Нд → 7 */
export const isoWeekdayOf = (d: Date): IsoWeekday =>
  (d.getDay() === 0 ? 7 : d.getDay()) as IsoWeekday;
