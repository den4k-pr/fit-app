import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Довільний ввід → E.164 (`+48501000001`) або null, якщо номер недійсний */
export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim());
  return parsed?.isValid() ? parsed.number : null;
}
