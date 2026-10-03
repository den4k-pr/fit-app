import { AppLanguage } from '@/types';

/** Назви мов: рідною мовою (не перекладаються) */
export const LANGUAGE_LABEL: Record<AppLanguage, string> = {
  [AppLanguage.Uk]: 'Українська',
  [AppLanguage.Ru]: 'Русский',
  [AppLanguage.Pl]: 'Polski',
  [AppLanguage.En]: 'English',
};

export const LANGUAGES: readonly AppLanguage[] = [AppLanguage.Uk, AppLanguage.Ru, AppLanguage.Pl, AppLanguage.En];

/**
 * Порядок кнопок мов у сітці 2×2 (профіль, вибір мови на старті): українська й російська — у протилежних кутах
 * (по діагоналі), щоб їх не плутали й не натискали одну замість іншої.
 */
export const LANGUAGES_DISPLAY_ORDER: readonly AppLanguage[] = [AppLanguage.Uk, AppLanguage.En, AppLanguage.Pl, AppLanguage.Ru];
export const DEFAULT_LANGUAGE: AppLanguage = AppLanguage.En;

/**
 * Мови, які сервер зберігає в профілі (push, SMS, листи, назви вправ/програм).
 * Бекенд підтримує uk/pl/en/ru нативно — мапінг тотожний, залишений для єдиної точки, де
 * клієнт вирішує, яку мову профілю надсилати (замість підміни на клієнті окремими картами).
 */
export const SERVER_LANGUAGE: Record<AppLanguage, AppLanguage> = {
  [AppLanguage.Uk]: AppLanguage.Uk,
  [AppLanguage.Ru]: AppLanguage.Ru,
  [AppLanguage.Pl]: AppLanguage.Pl,
  [AppLanguage.En]: AppLanguage.En,
};

export const isAppLanguage = (value: unknown): value is AppLanguage => LANGUAGES.includes(value as AppLanguage);
