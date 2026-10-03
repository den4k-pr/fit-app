import { addMonths, format, parseISO } from 'date-fns';
import { useState } from 'react';
import type { YearMonth } from '@/types';

export interface MonthNavigation {
  month: YearMonth;
  isCurrentMonth: boolean;
  /** Вперед: до поточного місяця (історія) або на рік уперед (програма тренувань) */
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
}

const toMonth = (d: Date): YearMonth => format(d, 'yyyy-MM');

/** Поточний місяць календаря та перемикання ‹ ›. `allowFuture` — для «Програми тренувань» (попереду до 12 міс.) */
export function useMonthNavigation(initial?: YearMonth, { allowFuture = false }: { allowFuture?: boolean } = {}): MonthNavigation {
  const current = toMonth(new Date());
  const limit = allowFuture ? toMonth(addMonths(new Date(), 12)) : current;
  const [month, setMonth] = useState<YearMonth>(initial ?? current);
  const shift = (delta: number) => setMonth((m) => toMonth(addMonths(parseISO(`${m}-01`), delta)));
  return {
    month,
    isCurrentMonth: month === current,
    canGoNext: month < limit,
    goPrev: () => shift(-1),
    goNext: () => shift(1),
  };
}
