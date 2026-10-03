// ПЕРШИМ: правила множини до ініціалізації i18next (на Android у Hermes немає Intl.PluralRules)
import './plural-rules';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readCachedConfig } from '@/config/remote-config';
import { DEFAULT_LANGUAGE, SERVER_LANGUAGE, isAppLanguage } from '@/constants/languages';
import { useSettingsStore } from '@/store/settings.store';
import { AppLanguage } from '@/types';
import en from './locales/en.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

/** Мова пристрою → одна з підтримуваних (інакше англійська) */
export function detectDeviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return isAppLanguage(code) ? code : DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: { uk: { translation: uk }, ru: { translation: ru }, pl: { translation: pl }, en: { translation: en } },
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

const BUNDLED: Record<string, unknown> = { uk, ru, pl, en };

/** Стандартний (вшитий) текст за ключем `a.b.c` */
function bundledText(language: string, key: string): string | undefined {
  let node: unknown = BUNDLED[language];
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

type ContentOverrides = Record<string, Record<string, string>>;

/**
 * Тексти екранів з CRM поверх вшитих перекладів. Ключі, прибрані з CRM (`previous` є, `next` нема),
 * повертаються до стандартного тексту — без перезапуску застосунку.
 */
export function applyContentOverrides(
  next: ContentOverrides,
  previous: ContentOverrides = {},
  rerender = true,
): void {
  for (const [language, texts] of Object.entries(previous)) {
    for (const key of Object.keys(texts)) {
      if (next[language]?.[key] !== undefined) continue;
      const fallback = bundledText(language, key);
      if (fallback !== undefined) i18n.addResource(language, 'translation', key, fallback);
    }
  }
  for (const [language, texts] of Object.entries(next)) {
    for (const [key, value] of Object.entries(texts)) {
      if (bundledText(language, key) !== undefined) i18n.addResource(language, 'translation', key, value);
    }
  }
  // перемалювати екрани, що вже показують тексти
  if (rerender) void i18n.changeLanguage(i18n.language);
}

applyContentOverrides(readCachedConfig()?.content ?? {}, {}, false);

/**
 * Мова, обрана на першому екрані (до входу), має діяти й після перезапуску застосунку: налаштування читаються
 * з AsyncStorage асинхронно, тож застосовуємо її, щойно сховище відновилось. Після входу мову уточнює session.ts.
 */
function applyStoredLanguage(): void {
  const chosen = useSettingsStore.getState().languageOverride;
  if (chosen && isAppLanguage(chosen) && i18n.language !== chosen) void i18n.changeLanguage(chosen);
}
if (useSettingsStore.persist.hasHydrated()) applyStoredLanguage();
else useSettingsStore.persist.onFinishHydration(applyStoredLanguage);

/** Перемикання мови інтерфейсу (одразу). Серверну мову профілю оновлює useLanguageSwitch. */
export function setAppLanguage(language: AppLanguage): Promise<unknown> {
  return i18n.changeLanguage(language);
}

/**
 * Яка мова інтерфейсу після входу: збережений вибір людини (наприклад, «Русский»), якщо він узгоджений із серверною
 * мовою профілю; інакше мова з профілю.
 */
export function resolveUiLanguage(serverLanguage: AppLanguage): AppLanguage {
  const chosen = useSettingsStore.getState().languageOverride;
  return chosen && SERVER_LANGUAGE[chosen] === serverLanguage ? chosen : serverLanguage;
}

export default i18n;
