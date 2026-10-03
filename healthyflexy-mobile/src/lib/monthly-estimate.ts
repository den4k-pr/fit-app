import { PLAN } from '@/constants/limits';
import type { Money } from '@/types';

/** Орієнтовна сума на місяць: ставка × днів на тиждень × 4,33 (ТЗ §7.2). Лише підказка в UI, гроші рахує сервер. */
export function estimateMonthly(rate: Money, daysPerWeek: number): Money {
  return Math.round(rate * daysPerWeek * PLAN.WEEKS_PER_MONTH);
}
