import { ExerciseCategory, VoicePattern, WorkoutType } from '../../common/enums';
import { isoWeekdayOf } from '../../common/utils/date.util';
import { Exercise } from '../exercises/entities/exercise.entity';

/**
 * «Підбір вправ ШІ» — детермінований алгоритм планування (без мовної моделі: однаковий результат для дня
 * на будь-якому пристрої, нічого не коштує й не залежить від мережі).
 *
 * Кожне заняття ЗМІШАНЕ — у ньому потроху всіх видів, що є в каталозі:
 *  1. Розминка — легке кардіо (розігріти тіло й серце; не берпі).
 *  2. Далі по черзі: силова → кор/утримання → кардіо → силова → … поки вміщається в «Час тренування».
 *  3. Якщо в каталозі є координація, розтяжка чи дихальні — вони теж входять у чергу (дихальна — наприкінці).
 *  4. Від заняття до заняття вправи кожного виду ротуються: щоразу інший набір, за кілька занять — увесь каталог.
 *  5. Навантаження хвилеподібне по тижнях (легше → норма → важче → норма) поверх «Автоускладнення».
 *  6. Вправи на крокомір у підбір не входять.
 */

export type AiBucket = 'cardio' | 'strength' | 'core' | 'coordination' | 'stretch' | 'breathing';

/** Черга видів у занятті (після розминки); види без вправ у каталозі пропускаються */
const DAY_PATTERN: readonly AiBucket[] = [
  'strength',
  'core',
  'cardio',
  'strength',
  'coordination',
  'core',
  'stretch',
  'cardio',
  'strength',
];

/** Хвиля навантаження по тижнях: легше · норма · важче · норма */
export const AI_INTENSITY_WAVE: readonly number[] = [0.9, 1, 1.15, 1];

/** Понеділок — точка відліку тижнів */
const EPOCH_MONDAY = Date.parse('2024-01-01T00:00:00Z');
const DAY_MS = 86_400_000;

/** Вид вправи для планувальника; кроки/ходьба — null (у підбір не входять) */
export function aiBucketOf(
  exercise: Pick<Exercise, 'category' | 'targetSteps' | 'workoutTypes' | 'voicePattern'>,
): AiBucket | null {
  if (exercise.targetSteps !== null) return null;
  if ((exercise.workoutTypes ?? []).includes(WorkoutType.WALKING)) return null;
  switch (exercise.category) {
    case ExerciseCategory.CARDIO:
      return 'cardio';
    case ExerciseCategory.STRENGTH:
      // утримання (планка, «стільчик») і скручування — кор; решта — силові
      return exercise.voicePattern === VoicePattern.HOLD ||
        exercise.voicePattern === VoicePattern.RAISE
        ? 'core'
        : 'strength';
    case ExerciseCategory.BALANCE:
      return 'coordination';
    case ExerciseCategory.STRETCH:
    case ExerciseCategory.JOINT_MOBILITY:
      return 'stretch';
    case ExerciseCategory.BREATHING:
      return 'breathing';
    default:
      return null;
  }
}

/** Порядковий номер заняття від точки відліку: тижні × днів плану + місце дня в тижні */
export function planSessionIndex(planDays: number[], date: string): number {
  const days = [...new Set(planDays)].sort((a, b) => a - b);
  if (days.length === 0) return 0;
  const daysSince = Math.floor((Date.parse(`${date}T00:00:00Z`) - EPOCH_MONDAY) / DAY_MS);
  const week = Math.floor(daysSince / 7);
  const before = days.filter((d) => d < isoWeekdayOf(date)).length;
  return week * days.length + before;
}

/** Множник навантаження дня за хвилею (тиждень = одне коло хвилі) */
export function aiIntensityOf(_planDays: number[], date: string): number {
  const daysSince = Math.floor((Date.parse(`${date}T00:00:00Z`) - EPOCH_MONDAY) / DAY_MS);
  const week = Math.floor(daysSince / 7);
  return AI_INTENSITY_WAVE[mod(week, AI_INTENSITY_WAVE.length)];
}

export interface AiDayOptions {
  planDays: number[];
  /** Бюджет дня, хв */
  workoutMinutes: number;
  /** Ліміт вправ на день (CRM) */
  maxExercises: number;
}

/** Склад дня з активного каталогу. Чиста функція: той самий каталог + дата → той самий день. */
export function pickAiDay(catalog: Exercise[], date: string, options: AiDayOptions): Exercise[] {
  const buckets = new Map<AiBucket, Exercise[]>();
  for (const e of [...catalog].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug),
  )) {
    const bucket = aiBucketOf(e);
    if (bucket) buckets.set(bucket, [...(buckets.get(bucket) ?? []), e]);
  }
  const session = planSessionIndex(options.planDays, date);
  const taken = new Set<string>();

  /** Наступна невикористана вправа виду; старт зсувається на номер заняття → щоразу інший набір */
  const draw = (bucket: AiBucket, fits: (e: Exercise) => boolean = () => true): Exercise | null => {
    const list = buckets.get(bucket) ?? [];
    for (let k = 0; k < list.length; k += 1) {
      const candidate = list[mod(session + k, list.length)];
      if (!taken.has(candidate.id) && fits(candidate)) {
        taken.add(candidate.id);
        return candidate;
      }
    }
    return null;
  };

  const budget = Math.max(1, options.workoutMinutes);
  const minutes = (e: Exercise) => Math.max(1, e.durationMin ?? 2);
  const day: Exercise[] = [];
  let used = 0;

  // розминка — легке кардіо (без силової складової: не берпі й не «скелелаз»)
  const light = (e: Exercise) => !(e.workoutTypes ?? []).includes(WorkoutType.STRENGTH);
  const warmup = draw('cardio', light) ?? draw('stretch') ?? draw('cardio');
  if (warmup) {
    day.push(warmup);
    used += minutes(warmup);
  }
  const cooldown = draw('breathing');
  const reserve = cooldown ? minutes(cooldown) : 0;

  const pattern = DAY_PATTERN.filter((b) => (buckets.get(b)?.length ?? 0) > 0);
  // по колу за чергою видів, поки вміщається; вид, у якого скінчились вправи, пропускається
  for (let i = 0, misses = 0; pattern.length > 0 && misses < pattern.length; i += 1) {
    const next = draw(pattern[i % pattern.length]);
    if (!next) {
      misses += 1;
      continue;
    }
    if (day.length > 0 && used + minutes(next) + reserve > budget) {
      taken.delete(next.id);
      break;
    }
    misses = 0;
    day.push(next);
    used += minutes(next);
  }
  if (cooldown) day.push(cooldown);

  const max = Math.max(1, options.maxExercises);
  if (day.length <= max) return day;
  const tail = cooldown && max > 1 ? [cooldown] : [];
  return [...day.slice(0, max - tail.length), ...tail];
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
