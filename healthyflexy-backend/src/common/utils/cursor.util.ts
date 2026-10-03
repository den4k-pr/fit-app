import { DecodedCursor } from '../interfaces';

export const encodeCursor = (cursor: DecodedCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

/** Некоректний курсор → null (контролер повертає першу сторінку/помилку валідації) */
export function decodeCursor(raw: string): DecodedCursor | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as DecodedCursor).createdAt === 'string' &&
      typeof (value as DecodedCursor).id === 'string' &&
      !Number.isNaN(Date.parse((value as DecodedCursor).createdAt))
    ) {
      return value as DecodedCursor;
    }
    return null;
  } catch {
    return null;
  }
}
