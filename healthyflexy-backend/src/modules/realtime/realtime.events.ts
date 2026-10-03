import { LedgerStatus, SessionStatus } from '../../common/enums';

/**
 * WebSocket (socket.io). Клієнт підключається з `auth: { token: <accessToken> }`.
 * Сервер автоматично підписує сокет на кімнати `user:{userId}` та `family:{familyId}`.
 * Події тонкі: клієнт після них інвалідовує відповідні запити TanStack Query (не довіряє payload'у щодо грошей).
 * Дзеркало: мобільний `src/types/realtime.ts`.
 */
export const RealtimeEvent = {
  /** День змінився: виконано вправу, день завершено, закрито як missed */
  SESSION_UPDATED: 'session.updated',
  /** Новий earn або зміна settlement */
  LEDGER_UPDATED: 'ledger.updated',
  /** Змінено план/ставку або сім'ю створено */
  FAMILY_UPDATED: 'family.updated',
  /** Друга сторона видалила акаунт: «Друга сторона видалила акаунт» */
  FAMILY_REMOVED: 'family.removed',
} as const;

export type RealtimeEventName = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

export const roomForFamily = (familyId: string) => `family:${familyId}`;
export const roomForUser = (userId: string) => `user:${userId}`;

export interface SessionUpdatedPayload {
  familyId: string;
  sessionId: string;
  date: string;
  status: SessionStatus;
  exercisesDone: number;
  exercisesTotal: number;
}

export interface LedgerUpdatedPayload {
  familyId: string;
  ledgerId: string;
  status: LedgerStatus;
}

export interface FamilyUpdatedPayload {
  familyId: string;
}

export interface FamilyRemovedPayload {
  familyId: string;
}

export interface RealtimePayloadMap {
  [RealtimeEvent.SESSION_UPDATED]: SessionUpdatedPayload;
  [RealtimeEvent.LEDGER_UPDATED]: LedgerUpdatedPayload;
  [RealtimeEvent.FAMILY_UPDATED]: FamilyUpdatedPayload;
  [RealtimeEvent.FAMILY_REMOVED]: FamilyRemovedPayload;
}
