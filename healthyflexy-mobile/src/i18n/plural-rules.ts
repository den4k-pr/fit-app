/**
 * Правила множини для i18next («1 секунда · 3 секунды · 30 секунд»).
 *
 * i18next обирає форму (`_one/_few/_many/_other`) через `Intl.PluralRules`. У JS-рушії Hermes (Android) його
 * немає — тоді i18next завжди брав запасну форму `_other`: «16 повторения», «30 секунды», «5 дня».
 * У браузері все було правильно, тому помилку видно лише на телефоні.
 *
 * Тут — точні правила CLDR для мов застосунку (uk, ru, pl, en), встановлюються, лише якщо рушій їх не має
 * або рахує неправильно. Працює без нових нативних модулів (оновлюється через OTA).
 */

type Category = 'one' | 'few' | 'many' | 'other';

function slavic(n: number, lang: string): Category {
  if (!Number.isInteger(n)) return 'other';
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (lang === 'pl') {
    if (abs === 1) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  // uk / ru: 1, 21, 31 … (крім 11) — one; 2–4, 22–24 … (крім 12–14) — few; решта цілих — many
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

export function pluralCategory(lang: string, n: number): Category {
  const base = lang.slice(0, 2).toLowerCase();
  if (base === 'uk' || base === 'ru' || base === 'pl') return slavic(n, base);
  return n === 1 ? 'one' : 'other';
}

const CATEGORIES: Record<string, Category[]> = {
  uk: ['few', 'many', 'one', 'other'],
  ru: ['few', 'many', 'one', 'other'],
  pl: ['few', 'many', 'one', 'other'],
};

class AppPluralRules {
  private readonly lang: string;
  constructor(locales?: string | string[]) {
    const first = Array.isArray(locales) ? locales[0] : locales;
    this.lang = (first ?? 'en').slice(0, 2).toLowerCase();
  }
  select(n: number): Category {
    return pluralCategory(this.lang, Number(n));
  }
  resolvedOptions() {
    return { locale: this.lang, type: 'cardinal', pluralCategories: CATEGORIES[this.lang] ?? ['one', 'other'] };
  }
  static supportedLocalesOf(locales: string | string[]): string[] {
    return Array.isArray(locales) ? locales : [locales];
  }
}

/** Чи рушій сам правильно рахує множину для слов'янських мов */
function nativeIsCorrect(): boolean {
  try {
    const ru = new Intl.PluralRules('ru');
    const pl = new Intl.PluralRules('pl');
    return ru.select(5) === 'many' && ru.select(22) === 'few' && ru.select(21) === 'one' && pl.select(5) === 'many';
  } catch {
    return false;
  }
}

if (typeof Intl === 'undefined' || typeof Intl.PluralRules === 'undefined' || !nativeIsCorrect()) {
  const g = globalThis as unknown as { Intl?: object };
  // лише одна властивість: решту Intl (NumberFormat, DateTimeFormat) не чіпаємо — вони неперелічувані,
  // і копіювання об'єкта їх би загубило
  if (!g.Intl) g.Intl = {};
  Object.defineProperty(g.Intl, 'PluralRules', { value: AppPluralRules, configurable: true, writable: true });
}
