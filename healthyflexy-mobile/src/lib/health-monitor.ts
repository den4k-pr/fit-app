import { healthUrl } from '@/lib/server-url';

const CHECK_TIMEOUT_MS = 4000;
const RECHECK_MS = 8000;
const OK_RECHECK_MS = 60_000;

type Listener = (down: boolean) => void;

const listeners = new Set<Listener>();
let down = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let polling = false;

async function check(): Promise<void> {
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  let ok = false;
  try {
    ok = (await fetch(healthUrl(), { signal: controller.signal })).ok;
  } catch {
    ok = false;
  } finally {
    clearTimeout(abort);
  }
  down = !ok;
  listeners.forEach((listener) => listener(down));
  timer = setTimeout(() => void check(), ok ? OK_RECHECK_MS : RECHECK_MS);
}

/**
 * Один спільний цикл опитування `/health` на весь застосунок, незалежно від того, скільки
 * компонентів `<ServerStatus>` зараз змонтовано (кожен таб навігації тримає свій AppHeader живим).
 * Раніше кожне монтування заводило власний setTimeout-цикл — звідси «зациклені» дублікати запитів у логах.
 */
export function subscribeHealth(listener: Listener): () => void {
  listeners.add(listener);
  listener(down);
  if (!polling) {
    polling = true;
    void check();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      polling = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
    }
  };
}
