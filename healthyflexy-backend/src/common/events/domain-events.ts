import { LedgerStatus, RelationshipType } from '../enums';

/**
 * Доменні події (@nestjs/event-emitter).
 * Сервіси лише емітять події, а notifications / realtime їх слухають:
 * так бізнес-логіка не знає про push і WebSocket.
 */
export const DomainEvent = {
  FAMILY_CREATED: 'family.created',
  FAMILY_REMOVED: 'family.removed',
  PLAN_UPDATED: 'plan.updated',
  EXERCISE_COMPLETED: 'exercise.completed',
  DAY_COMPLETED: 'day.completed',
  SETTLEMENT_CREATED: 'settlement.created',
  SETTLEMENT_RESOLVED: 'settlement.resolved',
  REMINDER_REQUESTED: 'reminder.requested',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

interface FamilyScoped {
  familyId: string;
  childId: string;
  parentId: string;
}

export interface FamilyCreatedEvent extends FamilyScoped {
  relationship: RelationshipType;
}

export interface FamilyRemovedEvent extends FamilyScoped {
  /** Хто видалив акаунт (друга сторона побачить «Друга сторона видалила акаунт») */
  removedByUserId: string;
}

export type PlanUpdatedEvent = FamilyScoped;

export interface ExerciseCompletedEvent extends FamilyScoped {
  sessionId: string;
  exerciseId: string;
  exercisesDone: number;
  exercisesTotal: number;
  hasPhotos: boolean;
}

export interface DayCompletedEvent extends FamilyScoped {
  sessionId: string;
  /** Локальна дата YYYY-MM-DD */
  date: string;
  earned: number;
  currency: string;
}

export interface SettlementCreatedEvent extends FamilyScoped {
  ledgerId: string;
  amount: number;
  currency: string;
}

export interface SettlementResolvedEvent extends FamilyScoped {
  ledgerId: string;
  amount: number;
  currency: string;
  status: LedgerStatus.CONFIRMED | LedgerStatus.REJECTED;
}

export interface ReminderRequestedEvent extends FamilyScoped {
  requestedByUserId: string;
}
