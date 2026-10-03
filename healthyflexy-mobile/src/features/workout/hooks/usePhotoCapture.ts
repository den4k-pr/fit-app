import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { PHOTO } from '@/constants/limits';
import { compressPhoto } from '@/services/photos/compress-photo';

export interface PhotoCapture {
  isCameraReady: boolean;
  isRunning: boolean;
  elapsedSec: number;
  /** Мілісекунди від старту (такт 250 мс) — для голосових підказок */
  elapsedMs: number;
  /** Зворотний відлік від ліміту вправи (recordMaxSec) */
  remainingSec: number;
  /** Скільки кадрів уже зроблено (0–24) */
  capturedCount: number;
  /** «Завершити» активна лише після останнього запланованого кадру (вправу не можна «проскочити») */
  canFinish: boolean;
  onCameraReady: () => void;
  onMountError: () => void;
  start: () => void;
  finish: () => void;
}

/**
 * Моменти зйомки: 24 точки рівномірно від 3% до 97% часу вправи (для 30 с — приблизно кожні 1,2 с):
 * щільна розкадровка, в якій видно сам рух, а AI оцінює його відрізками й каже, на якій секунді щось не так.
 */
const CAPTURE_POINTS = Array.from({ length: PHOTO.FRAMES }, (_, i) => 0.03 + (0.94 * i) / (PHOTO.FRAMES - 1));
const LAST_POINT = CAPTURE_POINTS[CAPTURE_POINTS.length - 1];

/**
 * Замість відео камера непомітно робить 24 кадри рівномірно за час вправи (відео ніде не зберігається).
 * Кадр → стиснення (720 px, JPEG) → список URI + секунда вправи кожного кадру (сервер пояснює відмову за часом).
 * `cameraRef` належить компоненту (він же рендерить <CameraView ref>). `onDone(uris, times)`: замало кадрів → пересняти.
 */
export function usePhotoCapture(
  cameraRef: RefObject<CameraView | null>,
  maxSeconds: number,
  onDone: (uris: string[], times: number[]) => void,
): PhotoCapture {
  const [isCameraReady, setCameraReady] = useState(false);
  const [isRunning, setRunning] = useState(false);
  /** Такт 250 мс: кадри потрібні кожні ~1,2 с, посекундний таймер відставав би */
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const [capturedCount, setCapturedCount] = useState(0);
  const uris = useRef<string[]>([]);
  const times = useRef<number[]>([]);
  const elapsedRef = useRef(0);
  const busy = useRef(false);
  const finished = useRef(false);

  const takeOne = useCallback(async () => {
    if (busy.current || uris.current.length >= PHOTO.FRAMES) return;
    busy.current = true;
    const at = elapsedRef.current;
    try {
      // низька якість одразу при зйомці: кадр готовий швидше (24 кадри за 30 с — кожні ~1,2 с)
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.3, shutterSound: false });
      if (shot?.uri) {
        uris.current.push(await compressPhoto(shot.uri));
        times.current.push(at);
        setCapturedCount(uris.current.length);
      }
    } catch {
      // кадр не вдався: пробуємо наступний у своєму моменті; порожній результат = «без фото»
    } finally {
      busy.current = false;
    }
  }, [cameraRef]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setRunning(false);
    void (async () => {
      // дочекатися кадру, що зараз знімається; добирати лише якщо кадрів замало для перевірки
      // (пачка однакових кадрів у кінці нічого не додає до розкадровки)
      while (busy.current) await new Promise((r) => setTimeout(r, 50));
      for (let i = uris.current.length; i < PHOTO.MIN_FRAMES; i += 1) await takeOne();
      onDone([...uris.current], [...times.current]);
    })();
  }, [onDone, takeOne]);

  useEffect(() => {
    if (!isRunning) return undefined;
    // зйомка стартує один раз (start ігнорується після finish), тож відлік — від цього моменту
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    elapsedRef.current = elapsedSec;
  }, [elapsedSec]);


  useEffect(() => {
    if (!isRunning) return;
    const due = CAPTURE_POINTS.filter((p) => elapsedMs >= p * maxSeconds * 1000).length;
    if (uris.current.length + (busy.current ? 1 : 0) < due) void takeOne();
    if (elapsedMs >= maxSeconds * 1000) finish();
  }, [elapsedMs, isRunning, maxSeconds, takeOne, finish]);

  return {
    isCameraReady,
    isRunning,
    elapsedSec,
    elapsedMs,
    remainingSec: Math.max(0, maxSeconds - elapsedSec),
    capturedCount,
    canFinish:
      isRunning &&
      elapsedSec >= Math.max(PHOTO.MIN_SECONDS_BEFORE_FINISH, Math.round(LAST_POINT * maxSeconds)),
    onCameraReady: () => setCameraReady(true),
    onMountError: () => finish(),
    start: () => {
      if (!isRunning && !finished.current) setRunning(true);
    },
    finish,
  };
}
