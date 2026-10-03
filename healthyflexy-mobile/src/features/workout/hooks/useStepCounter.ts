import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useMotionSteps } from './useMotionSteps';

export type StepCounterStatus = 'checking' | 'unavailable' | 'needs-permission' | 'denied' | 'ready';

export interface StepCounter {
  /**
   * ready — кроки рахуються (апаратним крокоміром і/або запасним лічильником за рухом телефона);
   * інші стани — лише коли не працює жоден спосіб.
   */
  status: StepCounterStatus;
  /** Стан апаратного крокоміра (для підказки «дозвольте доступ — буде точніше») */
  hardware: StepCounterStatus;
  /** Рахує запасний лічильник за акселерометром (апаратний недоступний або ще мовчить) */
  usingMotion: boolean;
  /** Кроки з моменту `since` */
  steps: number;
  /** Попросити дозвіл (iOS «Рух і фітнес» / Android «Фізична активність») */
  requestPermission: () => Promise<void>;
  /**
   * true — лічильник знає кроки навіть коли застосунок був у фоні (iOS: історія CoreMotion).
   * false — лише поки застосунок відкритий (Android без Health Connect): екран треба тримати ввімкненим.
   */
  countsInBackground: boolean;
}

/** iOS зберігає історію кроків (7 днів) і віддає кількість за будь-який проміжок; Android — ні */
const HAS_HISTORY = Platform.OS === 'ios';
const POLL_MS = 3000;

/**
 * Крокомір телефона з моменту `since` (expo-sensors).
 * iOS: опитуємо історію CoreMotion (`getStepCountAsync(since, now)`) — кроки, зроблені із заблокованим
 * екраном чи в іншому застосунку, теж зараховуються. Android: живий лічильник `watchStepCount`
 * (оновлення не приходять у фоні), тому кроки рахуються лише поки застосунок відкритий.
 * `autoRequest` — одразу попросити дозвіл (екран вправи); без нього — чекати на `requestPermission` (картка дня).
 */
export function useStepCounter(
  since: Date,
  { autoRequest = false, motionFallback = false }: { autoRequest?: boolean; motionFallback?: boolean } = {},
): StepCounter {
  const [status, setStatus] = useState<StepCounterStatus>('checking');
  const [historySteps, setHistorySteps] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const sinceMs = since.getTime();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyPermission = useCallback((granted: boolean, canAskAgain: boolean) => {
    if (!mounted.current) return;
    setStatus(granted ? 'ready' : canAskAgain ? 'needs-permission' : 'denied');
  }, []);

  const requestPermission = useCallback(async () => {
    const res = await Pedometer.requestPermissionsAsync();
    applyPermission(res.granted, res.canAskAgain);
  }, [applyPermission]);

  useEffect(() => {
    void (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (!available) return mounted.current && setStatus('unavailable');
      const current = await Pedometer.getPermissionsAsync();
      if (current.granted || !autoRequest) return applyPermission(current.granted, current.canAskAgain);
      await requestPermission();
    })();
  }, [autoRequest, applyPermission, requestPermission]);

  // живий лічильник (обидві платформи): кроки від моменту підписки
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const sub = Pedometer.watchStepCount((r) => setLiveSteps(r.steps));
    return () => {
      sub.remove();
      setLiveSteps(0);
    };
  }, [status, sinceMs]);

  // iOS: історія за проміжок — щоб не губити кроки, зроблені з вимкненим екраном
  useEffect(() => {
    if (status !== 'ready' || !HAS_HISTORY) return undefined;
    const poll = () =>
      void Pedometer.getStepCountAsync(new Date(sinceMs), new Date())
        .then((r) => mounted.current && setHistorySteps(r.steps))
        .catch(() => undefined);
    poll();
    const timer = setInterval(poll, POLL_MS);
    const appState = AppState.addEventListener('change', (s) => s === 'active' && poll());
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, [status, sinceMs]);

  // запасний лічильник за рухом телефона: на екрані вправи на кроки (телефон у руці/кишені)
  const motion = useMotionSteps(motionFallback);
  const hardwareSteps = Math.max(historySteps, liveSteps);
  const motionWorks = motionFallback && motion.available === true;
  const motionPending = motionFallback && motion.available === null;
  const usingMotion = motionWorks && motion.steps > hardwareSteps;

  return {
    status:
      status === 'ready' || motionWorks
        ? 'ready'
        : status === 'checking' || motionPending
          ? 'checking'
          : status,
    hardware: status,
    usingMotion,
    steps: Math.max(hardwareSteps, motionWorks ? motion.steps : 0),
    requestPermission,
    countsInBackground: HAS_HISTORY && status === 'ready',
  };
}
