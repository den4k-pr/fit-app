import { AppLanguage, ExerciseCategory, VoicePattern, WorkoutType } from '../../common/enums';
import { BodyImpact, LocalizedText } from '../../common/types';

/**
 * Стартові 4 вправи (розділ 10.2 ТЗ v3.0). Значення стартові:
 * фінальні вправи, демо-відео та тексти надаються окремо.
 *
 * ⚠️ Джерела перенесені з ТЗ v2.0 без перевірки, а тексти «Користь» не є медичними
 * рекомендаціями: верифікувати перед публікацією; польські тексти перевірити носієм.
 */
export interface ExerciseSeed {
  slug: string;
  sortOrder: number;
  category: ExerciseCategory;
  name: LocalizedText;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки: ціль крокоміра (фото не робляться) */
  targetSteps?: number | null;
  recordMaxSec: number;
  demoVideoUrl: string | null;
  benefit: LocalizedText;
  sourceTitle: string;
  sourceUrl: string | null;
  isActive: boolean;
  /** Гериатричний модуль: опис/безпека для UI, критерії для AI-аналізу. Немає в базовому наборі v3.0. */
  description?: LocalizedText;
  safetyInstructions?: LocalizedText;
  aiCriteria?: string;
  /** Макет: види навантаження, тривалість (хв), «вплив на організм», м'язи */
  workoutTypes: WorkoutType[];
  durationMin: number;
  bodyImpact: BodyImpact;
  muscles: LocalizedText[];
  /** Група різновидів (вправи групи чергуються по днях); null — не чергується */
  variantGroup: string | null;
  /** Ритм голосового супроводу */
  voicePattern: VoicePattern | null;
}

const L = AppLanguage;

export const EXERCISES_SEED: ExerciseSeed[] = [
  {
    slug: 'chair-squat',
    sortOrder: 1,
    category: ExerciseCategory.STRENGTH,
    name: {
      [L.UK]: 'Присідання біля стільця',
      [L.PL]: 'Przysiady przy krześle',
      [L.EN]: 'Chair squats',
      [L.RU]: 'Приседания у стула',
    },
    targetReps: 10,
    targetSeconds: null,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: "Зміцнює м'язи ніг і допомагає впевненіше вставати зі стільця.",
      [L.PL]: 'Wzmacnia mięśnie nóg i pomaga pewniej wstawać z krzesła.',
      [L.EN]: 'Strengthens leg muscles and makes getting up from a chair easier.',
      [L.RU]: 'Укрепляет мышцы ног и помогает увереннее вставать со стула.',
    },
    aiCriteria:
      'Squat pattern: hips move back and down with knees bending (toward any seat — chair, bed, sofa — or without one), then the person stands back up; body height visibly changes between frames.',
    sourceTitle: 'Hasegawa et al., Scientific Reports, 2021',
    sourceUrl: null,
    workoutTypes: [WorkoutType.STRENGTH],
    durationMin: 3,
    bodyImpact: { muscles: 80, heart: 30, brain: 10, bones: 70, energy: 40 },
    muscles: [
      {
        [L.UK]: 'Квадрицепси',
        [L.PL]: 'Mięśnie czworogłowe',
        [L.EN]: 'Quadriceps',
        [L.RU]: 'Квадрицепсы',
      },
      { [L.UK]: 'Сідниці', [L.PL]: 'Pośladki', [L.EN]: 'Glutes', [L.RU]: 'Ягодицы' },
      { [L.UK]: 'Литки', [L.PL]: 'Łydki', [L.EN]: 'Calves', [L.RU]: 'Икры' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.SQUAT,
    isActive: false,
  },
  {
    slug: 'march-in-place',
    sortOrder: 2,
    category: ExerciseCategory.CARDIO,
    name: {
      [L.UK]: 'Марш на місці',
      [L.PL]: 'Marsz w miejscu',
      [L.EN]: 'Marching in place',
      [L.RU]: 'Марш на месте',
    },
    targetReps: null,
    targetSeconds: 30,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: "Розганяє кровообіг і підтримує здоров'я серця.",
      [L.PL]: 'Poprawia krążenie i wspiera zdrowie serca.',
      [L.EN]: 'Boosts circulation and supports heart health.',
      [L.RU]: 'Разгоняет кровообращение и поддерживает здоровье сердца.',
    },
    aiCriteria:
      'Person standing upright, alternately lifting knees in a marching motion; different legs raised in different frames.',
    sourceTitle: 'Manson et al., NEJM, 1999',
    sourceUrl: null,
    workoutTypes: [WorkoutType.CARDIO, WorkoutType.WARMUP],
    durationMin: 2,
    bodyImpact: { muscles: 20, heart: 80, brain: 20, bones: 15, energy: 70 },
    muscles: [
      { [L.UK]: 'Литки', [L.PL]: 'Łydki', [L.EN]: 'Calves', [L.RU]: 'Икры' },
      {
        [L.UK]: 'Квадрицепси',
        [L.PL]: 'Mięśnie czworogłowe',
        [L.EN]: 'Quadriceps',
        [L.RU]: 'Квадрицепсы',
      },
      { [L.UK]: 'Серце', [L.PL]: 'Serce', [L.EN]: 'Heart', [L.RU]: 'Сердце' },
    ],
    variantGroup: 'cardio',
    voicePattern: VoicePattern.MARCH,
    isActive: true,
  },
  {
    slug: 'calf-raise',
    sortOrder: 3,
    category: ExerciseCategory.BALANCE,
    name: {
      [L.UK]: 'Підйом на носки',
      [L.PL]: 'Wspięcia na palce',
      [L.EN]: 'Calf raises',
      [L.RU]: 'Подъем на носки',
    },
    targetReps: 12,
    targetSeconds: null,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Тренує баланс і знижує ризик падінь.',
      [L.PL]: 'Ćwiczy równowagę i zmniejsza ryzyko upadków.',
      [L.EN]: 'Trains balance and lowers the risk of falls.',
      [L.RU]: 'Тренирует баланс и снижает риск падений.',
    },
    aiCriteria:
      'Person standing (optionally holding any stable support), heels rising off the floor onto the toes and lowering back down.',
    sourceTitle: 'Orr et al., Age and Ageing, 2008',
    sourceUrl: null,
    workoutTypes: [WorkoutType.STRENGTH, WorkoutType.COORDINATION],
    durationMin: 3,
    bodyImpact: { muscles: 60, heart: 20, brain: 25, bones: 65, energy: 30 },
    muscles: [
      { [L.UK]: 'Литки', [L.PL]: 'Łydki', [L.EN]: 'Calves', [L.RU]: 'Икры' },
      { [L.UK]: 'Стопи', [L.PL]: 'Stopy', [L.EN]: 'Feet', [L.RU]: 'Стопы' },
    ],
    variantGroup: 'balance',
    voicePattern: VoicePattern.RAISE,
    isActive: true,
  },
  {
    slug: 'breathing',
    sortOrder: 4,
    category: ExerciseCategory.BREATHING,
    name: {
      [L.UK]: 'Дихальна практика',
      [L.PL]: 'Ćwiczenie oddechowe',
      [L.EN]: 'Breathing practice',
      [L.RU]: 'Дыхательная практика',
    },
    targetReps: null,
    targetSeconds: 60,
    recordMaxSec: 60,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Заспокоює нервову систему та знижує стрес.',
      [L.PL]: 'Uspokaja układ nerwowy i zmniejsza stres.',
      [L.EN]: 'Calms the nervous system and reduces stress.',
      [L.RU]: 'Успокаивает нервную систему и снижает стресс.',
    },
    aiCriteria:
      'Person sitting or standing calmly with an upright posture, hands may rest on the belly or chest; the person must be clearly present in every frame.',
    sourceTitle: 'Fincham et al., Scientific Reports, 2023',
    sourceUrl: null,
    workoutTypes: [WorkoutType.BREATHING, WorkoutType.MEDITATION],
    durationMin: 3,
    bodyImpact: { muscles: 0, heart: 30, brain: 60, bones: 0, energy: 50 },
    muscles: [
      { [L.UK]: 'Діафрагма', [L.PL]: 'Przepona', [L.EN]: 'Diaphragm', [L.RU]: 'Диафрагма' },
      {
        [L.UK]: 'Нервова система',
        [L.PL]: 'Układ nerwowy',
        [L.EN]: 'Nervous system',
        [L.RU]: 'Нервная система',
      },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.BREATH,
    isActive: true,
  },
];
