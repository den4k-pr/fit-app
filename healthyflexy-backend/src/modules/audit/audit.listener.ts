import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DayCompletedEvent,
  DomainEvent,
  FamilyCreatedEvent,
  FamilyRemovedEvent,
  PlanUpdatedEvent,
  SettlementCreatedEvent,
  SettlementResolvedEvent,
} from '../../common/events/domain-events';

/**
 * Аудит грошових і сімейних подій: окремий структурований лог `event: "audit"`.
 * Дозволяє відновити «хто, що й коли» щодо балансу та складу сім'ї. Без персональних даних (лише id).
 */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger('Audit');

  private record(action: string, data: Record<string, unknown>): void {
    this.logger.log({ event: 'audit', action, ...data });
  }

  @OnEvent(DomainEvent.DAY_COMPLETED)
  dayCompleted(e: DayCompletedEvent): void {
    this.record('earn_created', {
      familyId: e.familyId,
      sessionId: e.sessionId,
      date: e.date,
      amount: e.earned,
      currency: e.currency,
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_CREATED)
  settlementCreated(e: SettlementCreatedEvent): void {
    this.record('settlement_created', {
      familyId: e.familyId,
      ledgerId: e.ledgerId,
      amount: e.amount,
      currency: e.currency,
      by: e.childId,
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_RESOLVED)
  settlementResolved(e: SettlementResolvedEvent): void {
    this.record('settlement_resolved', {
      familyId: e.familyId,
      ledgerId: e.ledgerId,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      by: e.parentId,
    });
  }

  @OnEvent(DomainEvent.PLAN_UPDATED)
  planUpdated(e: PlanUpdatedEvent): void {
    this.record('plan_updated', { familyId: e.familyId, by: e.childId });
  }

  @OnEvent(DomainEvent.FAMILY_CREATED)
  familyCreated(e: FamilyCreatedEvent): void {
    this.record('family_created', {
      familyId: e.familyId,
      childId: e.childId,
      parentId: e.parentId,
    });
  }

  @OnEvent(DomainEvent.FAMILY_REMOVED)
  familyRemoved(e: FamilyRemovedEvent): void {
    this.record('family_removed', { familyId: e.familyId, by: e.removedByUserId });
  }
}
