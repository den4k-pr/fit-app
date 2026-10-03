import type { LedgerStatus, SessionStatus } from './enums';
import type { ISODate } from './common';

/** Дзеркало backend `realtime.events.ts`. Події «тонкі»: після них інвалідуємо запити TanStack Query. */
export const RealtimeEvent = {
  SessionUpdated: 'session.updated',
  LedgerUpdated: 'ledger.updated',
  FamilyUpdated: 'family.updated',
  FamilyRemoved: 'family.removed',
} as const;
export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

export interface SessionUpdatedPayload {
  familyId: string;
  sessionId: string;
  date: ISODate;
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
  [RealtimeEvent.SessionUpdated]: SessionUpdatedPayload;
  [RealtimeEvent.LedgerUpdated]: LedgerUpdatedPayload;
  [RealtimeEvent.FamilyUpdated]: FamilyUpdatedPayload;
  [RealtimeEvent.FamilyRemoved]: FamilyRemovedPayload;
}
