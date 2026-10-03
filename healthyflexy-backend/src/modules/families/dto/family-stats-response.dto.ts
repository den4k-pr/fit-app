import { Currency } from '../../../common/enums';

/** GET /families/current/stats: рахується в SQL із ledger та day_sessions */
export class FamilyStatsResponseDto {
  currency: Currency;

  /** SUM(earn) */
  earnedTotal: number;

  /** SUM(settlement WHERE confirmed) */
  settledTotal: number;

  /** SUM(settlement WHERE pending) */
  pendingTotal: number;

  /** earnedTotal − settledTotal: «Належить» */
  owed: number;
  daysCompleted: number;
  daysMissed: number;

  /** completed / (completed + missed) × 100, ціле; 0 якщо ще немає завершених днів */
  completionPct: number;

  /** Запланованих днів поспіль зі статусом completed (розділ 8.4) */
  currentStreak: number;

  /**
   * «Фонд»: скільки можна заробити за поточний місяць — ставки вже створених днів місяця
   * + поточна ставка × заплановані дні, що ще попереду.
   */
  monthFund: number;

  /** Зароблено за активність у поточному місяці (сума нарахувань за дні місяця) */
  monthEarned: number;

  /** Запланованих днів тренувань у поточному місяці */
  monthPlannedDays: number;

  /** Виконаних днів у поточному місяці */
  monthCompletedDays: number;

  /** «Фонд»: усього закладено спонсором */
  fundDeposited: number;

  /** Залишок фонду (закладено − нараховано з моменту першого поповнення) */
  fundBalance: number;

  /** Витрата фонду за місяць при виконанні всіх занять (ставка × днів/тиждень × 4.33) */
  fundMonthlyCost: number;

  /** На скільки місяців вистачить залишку (0.1 точність); 0 — фонд порожній */
  fundMonths: number;

  /** До якої дати фонд покриває заняття (YYYY-MM-DD); null — фонд порожній */
  fundCoversUntil: string | null;
}
