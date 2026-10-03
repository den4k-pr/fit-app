/**
 * Країни, з чиїх номерів можна входити (ТЗ §5.4: за замовчуванням Польща).
 * Список ПОВИНЕН збігатися з `SMS_ALLOWED_COUNTRIES` на бекенді (і з Geo Permissions у Twilio): інакше SMS не піде.
 * Прапор малюється компонентом <Flag code=...>.
 */
export const SMS_COUNTRIES = [
  { code: 'PL', dial: '+48' },
  { code: 'UA', dial: '+380' },
] as const;

export type SmsCountryCode = (typeof SMS_COUNTRIES)[number]['code'];
export const DEFAULT_COUNTRY: SmsCountryCode = 'PL';
