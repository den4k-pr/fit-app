import { AsyncLocalStorage } from 'node:async_hooks';

/** Дані поточного HTTP-запиту, доступні будь-якому сервісу без протягування через параметри */
export interface RequestContext {
  /**
   * Сім'я, яку дитина обрала в перемикачі батьків (заголовок `X-Family-Id`). Сервер НЕ довіряє їй сліпо:
   * `FamilyContextService` бере її лише якщо користувач справді учасник цієї сім'ї.
   */
  familyId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Значення заголовка `X-Family-Id`, якщо це коректний UUID */
export function parseFamilyHeader(value: string | undefined): string | undefined {
  return value && UUID.test(value) ? value.toLowerCase() : undefined;
}
