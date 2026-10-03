import i18n from '@/i18n';
import { useSettingsStore } from '@/store/settings.store';
import { VOICE_CLIPS } from './clips.generated';

type SpeechModule = typeof import('expo-speech');
type AudioModule = typeof import('expo-audio');
type Player = ReturnType<AudioModule['createAudioPlayer']>;

/**
 * Голос тренера.
 *
 * 1. Фіксовані фрази («Вниз», «Вверх, 3», «Осталось 10 секунд», «Начали!» …) — ЗАПИСИ нейронного голосу
 *    (Piper, вільні ліцензії; `scripts/voice`), вшиті в застосунок: живий голос, правильні наголоси,
 *    однаково на всіх телефонах і без інтернету.
 * 2. Довільний текст (опис вправи, відгук AI) — системний синтезатор, але з НАЙКРАЩИМ голосом телефона
 *    (premium/enhanced/нейронний; «роботизовані» й жартівливі голоси відкидаються). Немає голосу потрібної
 *    мови — мовчимо: інакше синтезатор читав би кирилицю англійським голосом («неграмотно»).
 *
 * Нативні модулі підвантажуються ліниво: старий APK без expo-audio (OTA-оновлення) просто говорить
 * системним синтезатором, а не падає.
 */

function lazy<T>(load: () => T): () => T | null {
  let cached: T | null | undefined;
  return () => {
    if (cached !== undefined) return cached;
    try {
      cached = load();
    } catch {
      cached = null;
    }
    return cached;
  };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const speech = lazy(() => require('expo-speech') as SpeechModule);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const audio = lazy(() => require('expo-audio') as AudioModule);

/** Мова інтерфейсу → локаль синтезатора */
const LOCALE: Record<string, string> = { uk: 'uk-UA', ru: 'ru-RU', pl: 'pl-PL', en: 'en-US' };
const baseLang = () => (i18n.language ?? 'en').slice(0, 2);

export interface SayOptions {
  /** Перервати те, що звучить зараз (фази руху мають звучати вчасно, а не в черзі) */
  interrupt?: boolean;
  /** Швидкість системного синтезатора (записи звучать у своєму темпі) */
  rate?: number;
}

export const voiceEnabled = (): boolean => useSettingsStore.getState().voiceEnabled;

// ───── записи ─────

/**
 * ОДИН плеєр на всі фрази (запис змінюється через `replace`). Не плеєр на кожну фразу: на Android кожен —
 * окремий нативний плеєр із декодером, а декодерів на пристрої обмежена кількість (часто ~16) — десятки
 * одночасних плеєрів валили б застосунок.
 */
let player: Player | null = null;
let audioModeSet = false;

function clipFor(text: string): number | null {
  return VOICE_CLIPS[baseLang()]?.[text.trim()] ?? null;
}

function ensureAudioMode(a: AudioModule): void {
  if (audioModeSet) return;
  audioModeSet = true;
  // звучить і в беззвучному режимі iOS; музика користувача лише притихає, а не зупиняється
  void a.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false }).catch(() => undefined);
}

/** Відтворити запис; false — не вдалося (тоді говорить синтезатор) */
function playClip(clip: number): boolean {
  const a = audio();
  if (!a) return false;
  try {
    ensureAudioMode(a);
    if (player) player.replace(clip);
    else player = a.createAudioPlayer(clip);
    player.play();
    return true;
  } catch {
    return false;
  }
}

/** Звільнити плеєр (вихід з екрана вправи) */
export function releaseVoice(): void {
  try {
    player?.remove();
  } catch {
    // уже звільнено
  }
  player = null;
}

// ───── черга (без накладань запису на синтезатор) ─────

type Item = { text: string; rate: number };
const queue: Item[] = [];
let busyUntil = 0;
let drainTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDrain(ms: number): void {
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = setTimeout(() => {
    drainTimer = null;
    const next = queue.shift();
    if (next) play(next);
  }, Math.max(0, ms));
}

/** Відтворити одразу (попереднє вже зупинено або закінчилось) */
function play({ text, rate }: Item): void {
  const clip = clipFor(text);
  if (clip !== null && playClip(clip)) {
    // тривалість запису — оцінка за довжиною фрази (записи короткі, темп рівний)
    const duration = 350 + text.length * 70;
    busyUntil = Date.now() + duration;
    if (queue.length) scheduleDrain(duration + 60);
    return;
  }
  void speakSystem(text, rate);
}

function stopAll(): void {
  queue.length = 0;
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = null;
  busyUntil = 0;
  try {
    player?.pause();
  } catch {
    // плеєр уже звільнено
  }
  try {
    speech()?.stop();
  } catch {
    // нічого не звучало
  }
}

export function say(text: string, { interrupt = false, rate = 1 }: SayOptions = {}): void {
  if (!text || !voiceEnabled()) return;
  const item = { text, rate };
  if (interrupt) {
    stopAll();
    play(item);
    return;
  }
  // не перебиваємо: у чергу, якщо зараз щось звучить
  const wait = busyUntil - Date.now();
  if (wait > 0) {
    queue.push(item);
    if (!drainTimer) scheduleDrain(wait + 60);
    return;
  }
  play(item);
}

export function stopSpeaking(): void {
  stopAll();
}

// ───── системний синтезатор ─────

/** Найкращий голос для кожної локалі (null — голосу цієї мови на телефоні немає) */
const voiceByLocale = new Map<string, string | null>();
let voicesReady: Promise<void> | null = null;

/**
 * Рейтинг голосу: преміальні/покращені/нейронні — вище; «компактні» — нижче; жартівливі голоси macOS/iOS
 * (Bells, Bubbles, Zarvox…) та Eloquence (роботизований) — відкидаються.
 */
export function voiceScore(v: { identifier: string; name?: string; quality?: string | number }): number {
  const id = `${v.identifier} ${v.name ?? ''}`.toLowerCase();
  if (/novelty|eloquence|speech\.synthesis\.voice\.|superstar|bells|bubbles|zarvox|whisper|trinoids|organ|jester|bahh|boing|cellos|wobble|albert/.test(id)) return -100;
  let score = 0;
  if (/premium/.test(id)) score += 40;
  if (/enhanced/.test(id) || String(v.quality).toLowerCase() === 'enhanced') score += 25;
  if (/neural|wavenet|studio|network/.test(id)) score += 20;
  if (/siri/.test(id)) score += 15;
  if (/local/.test(id)) score += 5;
  if (/compact|legacy|low/.test(id)) score -= 10;
  return score;
}

function loadVoices(s: SpeechModule): Promise<void> {
  voicesReady ??= s
    .getAvailableVoicesAsync()
    .then((voices) => {
      for (const locale of Object.values(LOCALE)) {
        const lang = locale.slice(0, 2).toLowerCase();
        const norm = (l?: string) => (l ?? '').toLowerCase().replace('_', '-');
        const matching = voices.filter((v) => norm(v.language).startsWith(lang));
        const best = matching
          .map((v) => ({ v, score: voiceScore(v) + (norm(v.language) === locale.toLowerCase() ? 3 : 0) }))
          .filter((x) => x.score > -50)
          .sort((a, b) => b.score - a.score)[0];
        voiceByLocale.set(locale, best?.v.identifier ?? null);
      }
    })
    .catch(() => undefined);
  return voicesReady;
}

async function speakSystem(text: string, rate: number): Promise<void> {
  const s = speech();
  if (!s) return;
  try {
    // список голосів — один раз; чекаємо його недовго, щоб перша фраза не йшла «роботом» за замовчуванням
    await Promise.race([loadVoices(s), new Promise((r) => setTimeout(r, 700))]);
    const language = LOCALE[baseLang()] ?? 'en-US';
    const known = voiceByLocale.has(language);
    const voice = voiceByLocale.get(language);
    // список отримано, а голосу мови немає — краще тиша, ніж чужа вимова
    if (known && voice === null) return;
    busyUntil = Date.now() + 400 + text.length * 75;
    s.speak(text, {
      language,
      voice: voice ?? undefined,
      // повільніше за типове: розбірливіше для старших людей (відгуки ШІ — довгі речення)
      rate: 0.88 * rate,
      pitch: 1,
      onDone: () => {
        busyUntil = 0;
        if (queue.length) scheduleDrain(60);
      },
    });
  } catch {
    // синтезатор недоступний на цьому пристрої — продовжуємо без голосу
  }
}
