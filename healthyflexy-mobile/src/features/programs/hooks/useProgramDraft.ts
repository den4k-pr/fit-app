import { useState } from 'react';
import { getRemoteLimits } from '@/config/remote-config';
import { ProgramDurationType } from '@/types';
import type { Program, ProgramExerciseInput, SaveProgramRequest } from '@/types';

export interface ProgramDraftValues {
  name: string;
  description: string;
  durationType: ProgramDurationType;
  exercises: ProgramExerciseInput[];
}

export interface ProgramDraftController extends ProgramDraftValues {
  isDirty: boolean;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setDurationType: (type: ProgramDurationType) => void;
  /** Скільки вправ можна додати в програму (ліміт з CRM) */
  maxExercises: number;
  /** Додає вправу з каталогу в кінець списку (planDays = усі дні за замовчуванням); понад ліміт — ігнорується */
  addExercise: (exerciseId: string) => void;
  removeExercise: (index: number) => void;
  /** Є в списку / нема → прибрати / додати в кінець (каталог-пікер) */
  toggleExercise: (exerciseId: string) => void;
  moveExercise: (index: number, direction: -1 | 1) => void;
  setExerciseTargetReps: (index: number, value: number | undefined) => void;
  setExerciseTargetSeconds: (index: number, value: number | undefined) => void;
  toggleExerciseDay: (index: number, day: number) => void;
  /** Що відправити в POST /programs або PATCH /programs/:id */
  toRequest: () => SaveProgramRequest;
  reset: () => void;
}

const EMPTY: ProgramDraftValues = {
  name: '',
  description: '',
  durationType: ProgramDurationType.Week,
  exercises: [],
};

export const programValuesOf = (p: Program): ProgramDraftValues => ({
  name: p.name,
  description: p.description ?? '',
  durationType: p.durationType,
  exercises: [...p.exercises]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({
      exerciseId: e.exerciseId,
      targetReps: e.targetReps ?? undefined,
      targetSeconds: e.targetSeconds ?? undefined,
      targetSteps: e.targetSteps ?? undefined,
      planDays: e.planDays,
    })),
});

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Локальна чернетка програми (створення або редагування): зміни живуть у стані екрана,
 * на сервер йдуть лише по «Зберегти» — той самий патерн, що й `usePlanDraft`.
 */
export function useProgramDraft(saved: ProgramDraftValues = EMPTY): ProgramDraftController {
  const [draft, setDraft] = useState<ProgramDraftValues>(saved);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const moveItem = (exercises: ProgramExerciseInput[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return exercises;
    const next = [...exercises];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const maxExercises = getRemoteLimits().maxProgramExercises;

  return {
    ...draft,
    isDirty,
    maxExercises,
    setName: (name) => setDraft((d) => ({ ...d, name })),
    setDescription: (description) => setDraft((d) => ({ ...d, description })),
    setDurationType: (durationType) => setDraft((d) => ({ ...d, durationType })),
    addExercise: (exerciseId) =>
      setDraft((d) =>
        d.exercises.some((e) => e.exerciseId === exerciseId) || d.exercises.length >= maxExercises
          ? d
          : { ...d, exercises: [...d.exercises, { exerciseId, planDays: ALL_DAYS }] },
      ),
    removeExercise: (index) =>
      setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== index) })),
    toggleExercise: (exerciseId) =>
      setDraft((d) =>
        d.exercises.some((e) => e.exerciseId === exerciseId)
          ? { ...d, exercises: d.exercises.filter((e) => e.exerciseId !== exerciseId) }
          : d.exercises.length >= maxExercises
            ? d
            : { ...d, exercises: [...d.exercises, { exerciseId, planDays: ALL_DAYS }] },
      ),
    moveExercise: (index, direction) =>
      setDraft((d) => ({ ...d, exercises: moveItem(d.exercises, index, direction) })),
    setExerciseTargetReps: (index, value) =>
      setDraft((d) => ({
        ...d,
        exercises: d.exercises.map((e, i) => (i === index ? { ...e, targetReps: value } : e)),
      })),
    setExerciseTargetSeconds: (index, value) =>
      setDraft((d) => ({
        ...d,
        exercises: d.exercises.map((e, i) => (i === index ? { ...e, targetSeconds: value } : e)),
      })),
    toggleExerciseDay: (index, day) =>
      setDraft((d) => ({
        ...d,
        exercises: d.exercises.map((e, i) => {
          if (i !== index) return e;
          const has = e.planDays.includes(day);
          if (has && e.planDays.length === 1) return e; // мінімум 1 день
          const planDays = has ? e.planDays.filter((x) => x !== day) : [...e.planDays, day];
          return { ...e, planDays: planDays.sort((a, b) => a - b) };
        }),
      })),
    toRequest: () => ({
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      durationType: draft.durationType,
      exercises: draft.exercises,
    }),
    reset: () => setDraft(saved),
  };
}
