import type { TFunction } from 'i18next';
import { ExerciseCategory, VoicePattern, type TodayExercise } from '@/types';

/** Одна голосова підказка: що сказати й на якій мілісекунді вправи */
export interface Cue {
  atMs: number;
  text: string;
  /** Перервати попередню фразу (фази руху мають звучати вчасно) */
  interrupt?: boolean;
  rate?: number;
}

/** Ритми з двома фазами на повтор: «вниз — вверх», «вдох — выдох» */
const PHASED: readonly VoicePattern[] = [
  VoicePattern.Squat,
  VoicePattern.Lunge,
  VoicePattern.Push,
  VoicePattern.Bridge,
  VoicePattern.Raise,
  VoicePattern.Reach,
  VoicePattern.Twist,
  VoicePattern.Fold,
  VoicePattern.Breath,
];

/** Темп повтору за замовчуванням (коли ціль — секунди, а не повтори), мс */
const DEFAULT_REP_MS: Partial<Record<VoicePattern, number>> = {
  [VoicePattern.Breath]: 8000,
  [VoicePattern.Twist]: 2400,
  [VoicePattern.Fold]: 3600,
  [VoicePattern.Raise]: 2600,
  [VoicePattern.Reach]: 3200,
  [VoicePattern.Squat]: 2800,
  [VoicePattern.Lunge]: 3200,
  [VoicePattern.Push]: 2800,
  [VoicePattern.Bridge]: 2600,
};

/** Ритм вправи: заданий у CRM, інакше — за категорією */
export function resolvePattern(exercise: Pick<TodayExercise, 'voicePattern' | 'category' | 'targetSteps'>): VoicePattern {
  if (exercise.voicePattern) return exercise.voicePattern;
  if (exercise.targetSteps !== null) return VoicePattern.Steps;
  switch (exercise.category) {
    case ExerciseCategory.Breathing:
      return VoicePattern.Breath;
    case ExerciseCategory.Cardio:
      return VoicePattern.March;
    case ExerciseCategory.Balance:
      return VoicePattern.Hold;
    case ExerciseCategory.Stretch:
      return VoicePattern.Fold;
    case ExerciseCategory.JointMobility:
      return VoicePattern.Circle;
    default:
      return VoicePattern.Squat;
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));


/** «Вверх, 3» — фаза й номер повтору. Той самий формат у генераторі голосових записів (scripts/voice) */
export const voiceCount = (phase: string, n: number): string => `${phase}, ${n}`;

/** Темп дихання для утримань (планка, «стільчик») і вправ у темпі (біг на місці, «зірочка»), мс на фазу */
const BREATH_PHASE_MS: Partial<Record<VoicePattern, number>> = {
  [VoicePattern.Hold]: 2500,
  [VoicePattern.Breath]: 3500,
  [VoicePattern.March]: 1800,
  [VoicePattern.Jacks]: 1800,
  [VoicePattern.Circle]: 2000,
};

/**
 * План підказок на час зйомки вправи (відлік «3-2-1» звучить окремо, до старту).
 * Голос проговорює ДИХАННЯ — «Вдих» / «Видих» мовою застосунку (живі записи для uk/ru/pl/en), як у демо-роликах:
 *  • вправи на повтори: вдих на опусканні, видих на зусиллі (у скручуваннях навпаки — видих на підйомі);
 *    темп підганяється так, щоб ціль повторів уміщалася в час вправи; фрази не перебивають одна одну;
 *  • утримання й вправи в темпі: рівне чергування вдиху й видиху.
 * Наприкінці — «Ціль виконано!», відлік останніх секунд і «Стоп».
 */
export function buildCuePlan(
  exercise: Pick<TodayExercise, 'voicePattern' | 'category' | 'targetSteps' | 'targetReps' | 'targetSeconds'>,
  totalSec: number,
  t: TFunction,
): Cue[] {
  const pattern = resolvePattern(exercise);
  const totalMs = totalSec * 1000;
  const cues: Cue[] = [{ atMs: 0, text: t('voice.go'), interrupt: true }];
  const reps = exercise.targetReps;
  const inhale = t('voice.phase.breath.a');
  const exhale = t('voice.phase.breath.b');

  if (pattern === VoicePattern.Steps) {
    cues.push({ atMs: Math.round(totalMs / 2), text: t('voice.half') });
  } else if (reps && PHASED.includes(pattern)) {
    // скручування: зусилля — підйом (видих), решта — зусилля на поверненні вгору
    const [first, second] = pattern === VoicePattern.Raise ? [exhale, inhale] : [inhale, exhale];
    const repMs = clamp((totalMs * 0.9) / reps, 1600, 4200);
    const offset = 900;
    for (let r = 0; offset + r * repMs < totalMs - 800; r += 1) {
      const start = offset + r * repMs;
      const mid = start + repMs / 2;
      cues.push({ atMs: start, text: first });
      cues.push({ atMs: mid, text: second });
      // «Ціль виконано!» — окремою фразою після останнього повтору цілі
      if (r + 1 === reps) cues.push({ atMs: mid + Math.min(1100, repMs / 2 - 100), text: t('voice.targetDone'), interrupt: true });
    }
  } else {
    const phaseMs = BREATH_PHASE_MS[pattern] ?? DEFAULT_REP_MS[pattern] ?? 2500;
    for (let at = 1200, i = 0; at < totalMs - 3500; at += phaseMs, i += 1) {
      cues.push({ atMs: at, text: i % 2 === 0 ? inhale : exhale });
    }
  }

  // останні секунди: відлік «3-2-1» для вправ на час
  if (!reps && pattern !== VoicePattern.Breath) {
    for (const sec of [3, 2, 1]) cues.push({ atMs: totalMs - sec * 1000, text: String(sec), interrupt: true });
  }
  cues.push({ atMs: totalMs - 150, text: t('voice.finish'), interrupt: true });
  return cues.filter((c) => c.atMs >= 0 && c.atMs < totalMs).sort((a, b) => a.atMs - b.atMs);
}
