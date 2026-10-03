import 'i18next';
import type uk from '../i18n/locales/uk.json';

/** Типобезпечні ключі: t('parent.today.title') підказується IDE, невірний ключ = помилка компіляції. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof uk };
  }
}
