// Копіює стандартні тексти екранів мобільного застосунку (i18n) у CRM, щоб редактор показував,
// що саме зараз бачить користувач. Запуск: npm run sync-texts (після зміни перекладів у застосунку).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const locales = join(root, '..', 'healthyflexy-mobile', 'src', 'i18n', 'locales');
const PREFIXES = ['onboarding.', 'consent.', 'auth.', 'firstPlan.', 'invite.', 'disclaimer.', 'today.', 'reward.'];

const flatten = (node, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value && typeof value === 'object') flatten(value, path, out);
  }
  return out;
};

const result = {};
for (const lang of ['uk', 'ru', 'pl', 'en']) {
  const flat = flatten(JSON.parse(readFileSync(join(locales, `${lang}.json`), 'utf8')));
  result[lang] = Object.fromEntries(
    Object.entries(flat).filter(([k]) => PREFIXES.some((p) => k.startsWith(p))),
  );
}
writeFileSync(join(root, 'src', 'data', 'app-texts.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`app-texts.json: ${Object.keys(result.uk).length} ключів × 4 мови`);
