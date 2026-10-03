import { useEffect, useRef } from 'react';
import { releaseVoice, say, stopSpeaking } from '@/services/voice/speech';
import type { Cue } from './cue-plan';

/**
 * Промовляє підказки плану, щойно настає їхній час. Якщо за один такт настало кілька (телефон «пригальмував»),
 * звучить лише остання — щоб голос не відставав від руху. Після завершення/виходу голос зупиняється.
 */
export function useVoiceCues(plan: Cue[], running: boolean, elapsedMs: number): void {
  const next = useRef(0);

  useEffect(() => {
    if (!running) return;
    let due: Cue | null = null;
    while (next.current < plan.length && plan[next.current].atMs <= elapsedMs) {
      due = plan[next.current];
      next.current += 1;
    }
    if (due) say(due.text, { interrupt: due.interrupt, rate: due.rate });
  }, [plan, running, elapsedMs]);

  useEffect(
    () => () => {
      stopSpeaking();
      releaseVoice();
    },
    [],
  );
}
