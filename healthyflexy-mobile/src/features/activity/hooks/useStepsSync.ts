import { Pedometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '@/api/gateway';
import { toIsoDate } from '@/lib/iso-date';

/** Не частіше ніж раз на 5 хв (крім повернення в застосунок) */
const MIN_INTERVAL_MS = 5 * 60_000;
const HISTORY_DAYS = 7;

const dayStart = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
};

/**
 * Батько/мати: надсилає кроки за дні на сервер для графіка «Кроки і тренування» у дитини.
 * iOS — підсумки кожного з останніх 7 днів з історії CoreMotion; Android — лише `todaySteps`
 * (кроки, поки застосунок відкритий: без Health Connect історії немає). Помилки мовчки ігноруються.
 */
export function useStepsSync(todaySteps: number | null): void {
  const lastSync = useRef(0);
  const latestToday = useRef(todaySteps);
  useEffect(() => {
    latestToday.current = todaySteps;
  }, [todaySteps]);

  useEffect(() => {
    const sync = async (force: boolean) => {
      if (!force && Date.now() - lastSync.current < MIN_INTERVAL_MS) return;
      lastSync.current = Date.now();
      try {
        if (!(await Pedometer.isAvailableAsync()) || !(await Pedometer.getPermissionsAsync()).granted) return;
        const days: { date: string; steps: number }[] = [];
        if (Platform.OS === 'ios') {
          for (let i = 0; i < HISTORY_DAYS; i += 1) {
            const start = dayStart(i);
            const end = i === 0 ? new Date() : dayStart(i - 1);
            const { steps } = await Pedometer.getStepCountAsync(start, end);
            days.push({ date: toIsoDate(start), steps });
          }
        } else if (latestToday.current !== null) {
          days.push({ date: toIsoDate(dayStart(0)), steps: latestToday.current });
        }
        if (days.length > 0) await api.activity.syncSteps(days);
      } catch {
        // графік оновиться при наступній синхронізації
      }
    };
    void sync(true);
    const timer = setInterval(() => void sync(false), MIN_INTERVAL_MS);
    const appState = AppState.addEventListener('change', (s) => s === 'active' && void sync(true));
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, []);
}
