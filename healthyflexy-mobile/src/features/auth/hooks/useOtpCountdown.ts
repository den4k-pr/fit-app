import { useCallback, useEffect, useState } from 'react';

/** Лічильник «Повторно через N с»: `restart(seconds)` після кожного запиту коду */
export function useOtpCountdown(initialSeconds: number): { secondsLeft: number; canResend: boolean; restart: (seconds: number) => void } {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const restart = useCallback((seconds: number) => setSecondsLeft(seconds), []);
  return { secondsLeft, canResend: secondsLeft <= 0, restart };
}
