import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerStatus, SessionStatus } from '../../common/enums';
import {
  DayCompletedEvent,
  DomainEvent,
  ExerciseCompletedEvent,
  FamilyCreatedEvent,
  FamilyRemovedEvent,
  PlanUpdatedEvent,
  SettlementCreatedEvent,
  SettlementResolvedEvent,
} from '../../common/events/domain-events';
import { DaySession } from '../workouts/entities/day-session.entity';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeEvent } from './realtime.events';

/** Доменні події → realtime-події (ТЗ: Realtime замість Supabase Realtime) */
@Injectable()
export class RealtimeListener {
  private readonly logger = new Logger(RealtimeListener.name);

  constructor(
    private readonly gateway: RealtimeGateway,
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
  ) {}

  @OnEvent(DomainEvent.EXERCISE_COMPLETED)
  async onExercise(e: ExerciseCompletedEvent): Promise<void> {
    await this.sessionUpdated(e.familyId, e.sessionId, e.exercisesDone, e.exercisesTotal);
  }

  @OnEvent(DomainEvent.DAY_COMPLETED)
  async onDay(e: DayCompletedEvent): Promise<void> {
    const session = await this.sessions.findOne({ where: { id: e.sessionId } });
    if (session)
      await this.sessionUpdated(
        e.familyId,
        e.sessionId,
        session.exercisesDone,
        session.exercisesTotal,
      );
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.LEDGER_UPDATED, {
      familyId: e.familyId,
      ledgerId: e.sessionId,
      status: LedgerStatus.CONFIRMED,
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_CREATED)
  onSettlementCreated(e: SettlementCreatedEvent): void {
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.LEDGER_UPDATED, {
      familyId: e.familyId,
      ledgerId: e.ledgerId,
      status: LedgerStatus.PENDING,
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_RESOLVED)
  onSettlementResolved(e: SettlementResolvedEvent): void {
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.LEDGER_UPDATED, {
      familyId: e.familyId,
      ledgerId: e.ledgerId,
      status: e.status,
    });
  }

  @OnEvent(DomainEvent.PLAN_UPDATED)
  onPlan(e: PlanUpdatedEvent): void {
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.FAMILY_UPDATED, { familyId: e.familyId });
  }

  @OnEvent(DomainEvent.FAMILY_CREATED)
  onFamilyCreated(e: FamilyCreatedEvent): void {
    this.gateway.joinFamilyRoom([e.childId, e.parentId], e.familyId);
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.FAMILY_UPDATED, { familyId: e.familyId });
  }

  @OnEvent(DomainEvent.FAMILY_REMOVED)
  onFamilyRemoved(e: FamilyRemovedEvent): void {
    this.gateway.emitToFamily(e.familyId, RealtimeEvent.FAMILY_REMOVED, { familyId: e.familyId });
  }

  private async sessionUpdated(
    familyId: string,
    sessionId: string,
    done: number,
    total: number,
  ): Promise<void> {
    try {
      const session = await this.sessions.findOne({ where: { id: sessionId } });
      if (!session) return;
      this.gateway.emitToFamily(familyId, RealtimeEvent.SESSION_UPDATED, {
        familyId,
        sessionId,
        date: session.date,
        status: done >= total ? SessionStatus.COMPLETED : session.status,
        exercisesDone: done,
        exercisesTotal: total,
      });
    } catch (error) {
      this.logger.error({ event: 'realtime_emit_failed', reason: String(error) });
    }
  }
}
