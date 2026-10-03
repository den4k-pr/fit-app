import { ALL_EXERCISES_SEED } from '../exercises/exercises.seeder';
import { Exercise } from '../exercises/entities/exercise.entity';
import { VIDEO_EXERCISE_SLUGS } from '../../database/seeds/video-exercises.seed-data';
import { aiBucketOf, aiIntensityOf, pickAiDay, planSessionIndex } from './ai-planner';

/** Активний каталог із seed-даних (id = slug) — лише вправи з демо-роликами */
const catalog = ALL_EXERCISES_SEED.filter((e) => e.isActive).map(
  (e) => ({ ...e, id: e.slug, targetSteps: e.targetSteps ?? null }) as unknown as Exercise,
);
const PLAN_DAYS = [1, 2, 4, 5];
const options = { planDays: PLAN_DAYS, workoutMinutes: 15, maxExercises: 12 };
const week = ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09'];

describe('ai-planner: змішаний день із вправ із роликами', () => {
  it('активний каталог = рівно 10 вправ із демо-роликами', () => {
    expect(catalog.map((e) => e.slug).sort()).toEqual([...VIDEO_EXERCISE_SLUGS].sort());
  });

  it('номер заняття росте рівно на 1 між сусідніми днями плану', () => {
    const idx = week.map((d) => planSessionIndex(PLAN_DAYS, d));
    expect(idx.slice(1).map((v, i) => v - idx[i])).toEqual([1, 1, 1]);
  });

  it('кожен день змішаний: кардіо-розминка, силові й кор; у межах 15 хв і без повторів', () => {
    for (const date of week) {
      const day = pickAiDay(catalog, date, options);
      const kinds = new Set(day.map((e) => aiBucketOf(e)));
      expect(aiBucketOf(day[0])).toBe('cardio');
      expect(['jumping-jacks', 'high-knees']).toContain(day[0].slug);
      expect(kinds.has('strength')).toBe(true);
      expect(kinds.has('core')).toBe(true);
      expect(day.reduce((s, e) => s + e.durationMin, 0)).toBeLessThanOrEqual(15);
      expect(new Set(day.map((e) => e.id)).size).toBe(day.length);
      expect(day.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('вправи ротуються: сусідні заняття відрізняються', () => {
    const days = week.map((d) =>
      pickAiDay(catalog, d, options)
        .map((e) => e.id)
        .join(),
    );
    expect(new Set(days).size).toBe(days.length);
  });

  it('детермінований результат для дати', () => {
    expect(pickAiDay(catalog, week[1], options)).toEqual(pickAiDay(catalog, week[1], options));
  });

  it('хвиля навантаження по тижнях: легше · норма · важче · норма', () => {
    const waves = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map((d) =>
      aiIntensityOf(PLAN_DAYS, d),
    );
    expect([...waves].sort()).toEqual([0.9, 1, 1, 1.15]);
  });

  it('ліміт вправ на день', () => {
    expect(
      pickAiDay(catalog, week[0], { ...options, workoutMinutes: 60, maxExercises: 3 }),
    ).toHaveLength(3);
  });
});
