
import { differenceInSeconds, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import type { ISODateTime } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Зворотний відлік до моменту (наступне нагадування): `label` = «1:42:05» або «12:03» */
export function useCountdown(targetIso: ISODateTime | null): { secondsLeft: number; label: string } {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!targetIso) return undefined;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  const secondsLeft = targetIso ? Math.max(0, differenceInSeconds(parseISO(targetIso), now)) : 0;
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return { secondsLeft, label: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}` };
}
