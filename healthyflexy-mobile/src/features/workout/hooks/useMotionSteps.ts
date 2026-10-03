import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { createStepDetector } from './step-detector';

/** Частота опитування акселерометра: 25 Гц — достатньо для кроків і не садить батарею */
const INTERVAL_MS = 40;

export interface MotionSteps {
  /** Акселерометр є на пристрої; null — ще перевіряємо */
  available: boolean | null;
  steps: number;
}

/**
 * Запасний крокомір: рахує кроки за ритмічними поштовхами акселерометра (телефон у руці чи кишені).
 * Працює без дозволів і на телефонах без апаратного датчика кроків; лише поки застосунок відкритий.
 * Ізольований струс не рахується: потрібно щонайменше 4 кроки в ритмі.
 */
export function useMotionSteps(enabled: boolean): MotionSteps {
  const [available, setAvailable] = useState<boolean | null>(enabled ? null : false);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    void Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (cancelled) return;
        setAvailable(ok);
        if (!ok) return;
        Accelerometer.setUpdateInterval(INTERVAL_MS);
        const detector = createStepDetector();
        let last = 0;
        sub = Accelerometer.addListener((sample) => {
          const total = detector.push(sample, Date.now());
          if (total !== last) {
            last = total;
            setSteps(total);
          }
        });
      })
      .catch(() => setAvailable(false));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { available, steps };
}
