import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/** Довільний ввід → E.164 (`+48501234567`) або null. Без «+» використовується країна за замовчуванням (регіон пристрою). */
export function normalizeToE164(input: string, defaultCountry?: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry as CountryCode | undefined);
  return parsed?.isValid() ? parsed.number : null;
}

/** +48501234567 → «+48 501 234 567» */
export function formatForDisplay(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
