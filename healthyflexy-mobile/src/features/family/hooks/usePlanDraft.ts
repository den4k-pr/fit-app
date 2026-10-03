import { useEffect, useRef, useState } from 'react';
import { PLAN } from '@/constants/limits';
import { estimateMonthly } from '@/lib/monthly-estimate';
import { ALL_WORKOUT_TYPES, type Currency, type Family, type TimeHHmm, type UpdatePlanRequest, type WorkoutType } from '@/types';

export interface PlanValues {
  planDays: number[];
  rate: number;
  currency: Currency;
  reminderTime: TimeHHmm;
  /** «Види навантаження» */
  workoutTypes: WorkoutType[];
  /** «Час тренування», хв */
  workoutMinutes: number;
  /** «Автоускладнення» */
  autoProgression: boolean;
  progressionPct: number;
}

export interface PlanDraftController extends PlanValues {
  isDirty: boolean;
  /** «≈ €87 на місяць» — лише підказка, гроші рахує сервер */
  monthlyEstimate: number;
  toggleDay: (day: number) => void;
  setRate: (rate: number) => void;
  setCurrency: (currency: Currency) => void;
  setReminderTime: (time: TimeHHmm) => void;
  toggleWorkoutType: (type: WorkoutType) => void;
  setWorkoutMinutes: (minutes: number) => void;
  setAutoProgression: (on: boolean) => void;
  setProgressionPct: (pct: number) => void;
  /** Що відправити в PATCH /families/current/plan */
  toRequest: () => UpdatePlanRequest;
  reset: () => void;
}

/** Стартові значення навантаження (як на сервері): усі види, 20 хв, без автоускладнення */
export const DEFAULT_LOAD: Pick<PlanValues, 'workoutTypes' | 'workoutMinutes' | 'autoProgression' | 'progressionPct'> = {
  workoutTypes: ALL_WORKOUT_TYPES,
  workoutMinutes: PLAN.DEFAULT_WORKOUT_MINUTES,
  autoProgression: false,
  progressionPct: PLAN.DEFAULT_PROGRESSION_PCT,
};

export const planValuesOf = (f: Family): PlanValues => ({
  planDays: [...f.planDays].sort((a, b) => a - b),
  rate: f.rate,
  currency: f.currency,
  reminderTime: f.reminderTime,
  workoutTypes: f.workoutTypes,
  workoutMinutes: f.workoutMinutes,
  autoProgression: f.autoProgression,
  progressionPct: f.progressionPct,
});

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Локальна чернетка плану (редактор дитини або крок «перший план»): зміни живуть у стані екрана, на сервер йдуть лише по «Зберегти».
 * Коли збережений план змінюється (після «Зберегти»), чернетка оновлюється сама — без перемонтування екрана.
 */
export function usePlanDraft(saved: PlanValues): PlanDraftController {
  const [draft, setDraft] = useState<PlanValues>(saved);
  // збережений план змінився (після «Зберегти» чи з іншого пристрою) → чернетка дорівнює новому плану
  const savedKey = JSON.stringify(saved);
  const lastSaved = useRef(savedKey);
  useEffect(() => {
    if (lastSaved.current === savedKey) return;
    lastSaved.current = savedKey;
    setDraft(JSON.parse(savedKey) as PlanValues);
  }, [savedKey]);

  const isDirty =
    draft.rate !== saved.rate ||
    draft.currency !== saved.currency ||
    draft.reminderTime !== saved.reminderTime ||
    draft.planDays.join() !== saved.planDays.join() ||
    !sameSet(draft.workoutTypes, saved.workoutTypes) ||
    draft.workoutMinutes !== saved.workoutMinutes ||
    draft.autoProgression !== saved.autoProgression ||
    draft.progressionPct !== saved.progressionPct;

  return {
    ...draft,
    isDirty,
    monthlyEstimate: estimateMonthly(draft.rate, draft.planDays.length),
    toggleDay: (day) =>
      setDraft((d) => {
        const has = d.planDays.includes(day);
        // мінімум 1 день заняття (ТЗ §7.2)
        if (has && d.planDays.length === 1) return d;
        const next = has ? d.planDays.filter((x) => x !== day) : [...d.planDays, day];
        return { ...d, planDays: next.sort((a, b) => a - b) };
      }),
    setRate: (rate) => setDraft((d) => ({ ...d, rate })),
    setCurrency: (currency) => setDraft((d) => ({ ...d, currency })),
    setReminderTime: (reminderTime) => setDraft((d) => ({ ...d, reminderTime })),
    toggleWorkoutType: (type) =>
      setDraft((d) => {
        const has = d.workoutTypes.includes(type);
        // мінімум один вид навантаження
        if (has && d.workoutTypes.length === 1) return d;
        return { ...d, workoutTypes: has ? d.workoutTypes.filter((x) => x !== type) : [...d.workoutTypes, type] };
      }),
    setWorkoutMinutes: (workoutMinutes) => setDraft((d) => ({ ...d, workoutMinutes })),
    setAutoProgression: (autoProgression) => setDraft((d) => ({ ...d, autoProgression })),
    setProgressionPct: (progressionPct) => setDraft((d) => ({ ...d, progressionPct })),
    toRequest: () => ({ ...draft }),
    reset: () => setDraft(saved),
  };
}
