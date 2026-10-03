import type { File as FsFile } from 'expo-file-system';

/**
 * Налаштування застосунку з CRM (GET /app-config): палітра, тексти екранів, ліміти.
 * Кешуються у файлі: палітру треба застосувати СИНХРОННО до того, як модулі екранів створять StyleSheet
 * (див. `index.ts` → `theme/boot-theme.ts`), тож AsyncStorage тут не підходить.
 */
export interface RemoteTheme {
  presetId: string;
  colors: Record<string, string>;
}

export interface RemoteLimits {
  maxExercisesPerDay: number;
  maxProgramExercises: number;
}

export interface RemoteAppConfig {
  theme: RemoteTheme | null;
  /** мова → ключ i18n → текст */
  content: Record<string, Record<string, string>>;
  limits: RemoteLimits;
  version: string;
}

export const DEFAULT_LIMITS: RemoteLimits = { maxExercisesPerDay: 12, maxProgramExercises: 20 };

/**
 * Модуль файлової системи підвантажується ліниво й під try: якщо нативного модуля немає
 * (клієнт без цього модуля, напр. Expo Go іншої версії), застосунок стартує зі стандартною темою,
 * а не падає ще до реєстрації кореневого компонента.
 */
function cacheFile(): FsFile | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system') as typeof import('expo-file-system');
    return new fs.File(fs.Paths.document, 'app-config.json');
  } catch {
    return null;
  }
}

let current: RemoteAppConfig | null = null;

/** Синхронне читання кешу (виклик при старті, до рендеру) */
export function readCachedConfig(): RemoteAppConfig | null {
  if (current) return current;
  try {
    const file = cacheFile();
    if (!file?.exists) return null;
    const parsed = JSON.parse(file.textSync()) as RemoteAppConfig;
    current = { ...parsed, limits: { ...DEFAULT_LIMITS, ...parsed.limits } };
    return current;
  } catch {
    return null;
  }
}

export function saveConfig(config: RemoteAppConfig): void {
  current = config;
  try {
    cacheFile()?.write(JSON.stringify(config));
  } catch {
    // кеш не критичний: наступний запуск просто завантажить налаштування ще раз
  }
}

export function getRemoteLimits(): RemoteLimits {
  return readCachedConfig()?.limits ?? DEFAULT_LIMITS;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Лише відомі токени й валідні #RRGGBB: зламаний колір не має «покласти» інтерфейс */
export function sanitizeThemeColors(
  theme: RemoteTheme | null | undefined,
  known: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme?.colors ?? {})) {
    if (key in known && typeof value === 'string' && HEX.test(value)) out[key] = value;
  }
  return out;
}
