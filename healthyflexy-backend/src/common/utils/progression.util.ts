import { PLAN } from '../constants';

export interface ProgressionSettings {
  autoProgression: boolean;
  progressionPct: number;
  progressionStartDate: string | null;
}

const DAY_MS = 86_400_000;

/**
 * Множник цілей «Автоускладнення» на дату: (1 + pct%) ^ повних_тижнів від дати ввімкнення,
 * але не більше PLAN.PROGRESSION_MAX_FACTOR. Вимкнено / ще не минув тиждень → 1.
 */
export function progressionFactor(settings: ProgressionSettings, date: string): number {
  if (!settings.autoProgression || !settings.progressionStartDate) return 1;
  const days = Math.floor(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${settings.progressionStartDate}T00:00:00Z`)) /
      DAY_MS,
  );
  const weeks = Math.max(0, Math.floor(days / 7));
  return Math.min(PLAN.PROGRESSION_MAX_FACTOR, (1 + settings.progressionPct / 100) ** weeks);
}

/** Рівень 1–5 для профілю: рівномірно від множника 1 (рівень 1) до стелі (рівень 5) */
export function levelOf(factor: number): number {
  const step = (PLAN.PROGRESSION_MAX_FACTOR - 1) / (PLAN.LEVEL_MAX - 1);
  return Math.min(PLAN.LEVEL_MAX, Math.max(1, 1 + Math.floor((factor - 1) / step + 1e-9)));
}
