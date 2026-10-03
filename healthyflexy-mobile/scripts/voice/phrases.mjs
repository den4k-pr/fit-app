// Усі ФІКСОВАНІ фрази голосового тренера — рівно так, як їх формує застосунок (ті самі файли перекладів
// і правила множини i18next). Результат: scripts/voice/phrases.json → synthesize.py записує аудіо.
// Запуск: node scripts/voice/phrases.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import i18next from 'i18next';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LANGS = ['uk', 'ru', 'pl', 'en'];
/**
 * Лише фрази, які застосунок справді вимовляє (див. cue-plan.ts, CapturePhase, StepsPhase, DonePhase):
 * дихання «вдих / видих» під час вправи, старт, відлік 3-2-1, «Ціль виконано», «Стоп», «Вправу зараховано».
 * Раніше тут було ~400 фраз на мову (рахунок «Вгору, 1…40», «Залишилось N секунд») — 12 МБ записів у застосунку.
 */
const SIMPLE = [
  'voice.getReady', 'voice.go', 'voice.targetDone', 'voice.half', 'voice.finish', 'voice.accepted',
  'voice.steps.done', 'voice.phase.breath.a', 'voice.phase.breath.b',
];
/** Відлік «5…1» перед стартом і в кінці вправи на час */
const COUNTDOWN = 5;

const resources = Object.fromEntries(
  LANGS.map((l) => [l, { translation: JSON.parse(fs.readFileSync(path.join(root, `src/i18n/locales/${l}.json`), 'utf8')) }]),
);
await i18next.init({ resources, lng: 'uk', fallbackLng: 'en', interpolation: { escapeValue: false } });

const out = {};
for (const lng of LANGS) {
  const t = i18next.getFixedT(lng);
  const set = new Set();
  for (const key of SIMPLE) set.add(t(key));
  for (let n = 1; n <= COUNTDOWN; n += 1) set.add(String(n));
  out[lng] = [...set].filter(Boolean);
}
fs.writeFileSync(path.join(root, 'scripts/voice/phrases.json'), JSON.stringify(out, null, 1));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
