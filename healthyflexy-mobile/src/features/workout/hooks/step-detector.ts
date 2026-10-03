/** Поріг «удару» кроку (у g над рівнем гравітації) і поріг «відпускання» (гістерезис) */
const HIGH = 0.13;
const LOW = 0.05;
/** Кроки людини: не частіше ніж раз на 0,28 с і не рідше ніж раз на 2 с (інакше ритм перервався) */
const MIN_GAP_MS = 280;
const MAX_GAP_MS = 2000;
/** Скільки кроків поспіль у ритмі потрібно, щоб почати рахувати (відсіює поодинокі струси телефона) */
const RHYTHM_STEPS = 4;

export interface StepDetector {
  /** Нове вимірювання акселерометра (у g); повертає, скільки кроків нараховано всього */
  push: (sample: { x: number; y: number; z: number }, nowMs: number) => number;
}

/**
 * Детектор кроків за акселерометром: віднімає гравітацію (повільний фільтр), ловить поштовхи з гістерезисом
 * і рахує лише ритмічну ходьбу (4+ кроки поспіль з інтервалом 0,28–2 с).
 */
export function createStepDetector(): StepDetector {
  let gravity = 1;
  let armed = true;
  let lastStep = -Infinity;
  let pending = 0;
  let counted = 0;
  return {
    push: ({ x, y, z }, now) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      gravity = gravity * 0.92 + magnitude * 0.08;
      const dynamic = magnitude - gravity;
      if (armed && dynamic > HIGH) {
        armed = false;
        const gap = now - lastStep;
        if (gap < MIN_GAP_MS) return counted;
        lastStep = now;
        if (gap > MAX_GAP_MS) {
          pending = 1;
        } else if (pending < RHYTHM_STEPS) {
          pending += 1;
          if (pending === RHYTHM_STEPS) counted += RHYTHM_STEPS;
        } else {
          counted += 1;
        }
      } else if (!armed && dynamic < LOW) {
        armed = true;
      }
      return counted;
    },
  };
}
