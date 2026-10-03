import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { AppLanguage, LedgerStatus, LedgerType } from '../../common/enums';
import {
  DomainEvent,
  SettlementCreatedEvent,
  SettlementResolvedEvent,
} from '../../common/events/domain-events';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor.util';
import { fromCents, roundMoney, toCents } from '../../common/utils/money.util';
import { Family } from '../families/entities/family.entity';
import { FamilyContextService } from '../families/family-context.service';
import { BalanceService } from './balance.service';
import {
  CreateFundDepositDto,
  CreateSettlementDto,
  FundDepositResponseDto,
  LedgerEntryResponseDto,
  LedgerListQueryDto,
  LedgerListResponseDto,
  ResolveSettlementDto,
} from './dto';
import { FundDeposit } from './entities/fund-deposit.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

const CURSOR_TS = `to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/**
 * Облік розрахунків (ТЗ §8.5). ВСІ мутації — у транзакції з блокуванням рядка сім'ї (FOR UPDATE):
 * два одночасні «Переказ зроблено» не перевищать борг. Гроші реально переказуються поза застосунком.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerEntry) private readonly entries: Repository<LedgerEntry>,
    @InjectRepository(FundDeposit) private readonly deposits: Repository<FundDeposit>,
    private readonly dataSource: DataSource,
    private readonly context: FamilyContextService,
    private readonly balance: BalanceService,
    private readonly events: EventEmitter2,
  ) {}

  /** Журнал: нові першими; курсор = (createdAt з мікросекундами, id) */
  async list(user: AuthenticatedUser, query: LedgerListQueryDto): Promise<LedgerListResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const limit = query.limit;

    const qb = this.entries
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.session', 's')
      .leftJoinAndSelect('e.createdBy', 'u')
      .leftJoinAndSelect('e.exerciseRecord', 'r')
      .leftJoinAndSelect('r.exercise', 'x')
      .addSelect(CURSOR_TS, 'cursor_ts')
      .where('e.familyId = :familyId', { familyId: family.id })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .limit(limit + 1);
    if (query.type) qb.andWhere('e.type = :type', { type: query.type });
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      if (!cursor)
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.BAD_REQUEST,
          'Invalid cursor',
        );
      qb.andWhere('(e.created_at, e.id) < (CAST(:cAt AS timestamptz), CAST(:cId AS uuid))', {
        cAt: cursor.createdAt,
        cId: cursor.id,
      });
    }

    const { entities, raw } = await qb.getRawAndEntities<{ cursor_ts: string }>();
    const hasMore = entities.length > limit;
    const page = entities.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((e) => this.toResponse(e, user.language)),
      nextCursor:
        hasMore && last
          ? encodeCursor({ createdAt: raw[page.length - 1].cursor_ts, id: last.id })
          : null,
    };
  }

  /** «Переказ зроблено»: amount ≤ owed − pending (ТЗ §7.1) → запис `pending` */
  /** Поповнення «Фонду» спонсором (лише облік): валюта — поточна валюта сім'ї */
  async createFundDeposit(
    user: AuthenticatedUser,
    dto: CreateFundDepositDto,
  ): Promise<FundDepositResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const saved = await this.deposits.save(
      this.deposits.create({
        familyId: family.id,
        amount: roundMoney(dto.amount),
        currency: family.currency,
        createdById: user.id,
      }),
    );
    this.logger.log({ event: 'fund_deposit', familyId: family.id, amount: saved.amount });
    return {
      id: saved.id,
      amount: saved.amount,
      currency: saved.currency,
      createdAt: saved.createdAt,
    };
  }

  async createSettlement(
    user: AuthenticatedUser,
    dto: CreateSettlementDto,
  ): Promise<LedgerEntryResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const entry = await this.dataSource.transaction(async (manager) => {
      await this.lockFamily(manager, family.id);
      const { owed, pendingTotal } = await this.balance.getBalance(family.id, manager);
      const available = toCents(owed) - toCents(pendingTotal);
      if (available <= 0) throw new AppException(ErrorCode.NOTHING_OWED, HttpStatus.CONFLICT);
      const amount = roundMoney(dto.amount);
      if (toCents(amount) > available) {
        throw new AppException(
          ErrorCode.SETTLEMENT_EXCEEDS_OWED,
          HttpStatus.UNPROCESSABLE_ENTITY,
          `max ${fromCents(available)}`,
        );
      }
      return manager.getRepository(LedgerEntry).save(
        manager.getRepository(LedgerEntry).create({
          familyId: family.id,
          type: LedgerType.SETTLEMENT,
          amount,
          currency: family.currency,
          status: LedgerStatus.PENDING,
          createdById: user.id,
        }),
      );
    });

    const payload: SettlementCreatedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
      ledgerId: entry.id,
      amount: entry.amount,
      currency: entry.currency,
    };
    this.events.emit(DomainEvent.SETTLEMENT_CREATED, payload);
    return this.toResponse(
      await this.entries.findOneOrFail({
        where: { id: entry.id },
        relations: { createdBy: true, session: true },
      }),
      user.language,
    );
  }

  /** Батько/мати: «Так, отримано» / «Ні, не отримано». Лише `pending`, лише один раз. */
  async resolveSettlement(
    user: AuthenticatedUser,
    id: string,
    dto: ResolveSettlementDto,
  ): Promise<LedgerEntryResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const status = dto.accept ? LedgerStatus.CONFIRMED : LedgerStatus.REJECTED;

    const resolved = await this.dataSource.transaction(async (manager) => {
      await this.lockFamily(manager, family.id);
      const repo = manager.getRepository(LedgerEntry);
      const entry = await repo.findOne({
        where: { id, familyId: family.id, type: LedgerType.SETTLEMENT },
      });
      if (!entry) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
      if (entry.status !== LedgerStatus.PENDING) {
        throw new AppException(ErrorCode.SETTLEMENT_NOT_PENDING, HttpStatus.CONFLICT);
      }
      entry.status = status;
      entry.resolvedAt = new Date();
      return repo.save(entry);
    });

    const payload: SettlementResolvedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
      ledgerId: resolved.id,
      amount: resolved.amount,
      currency: resolved.currency,
      status: resolved.status as LedgerStatus.CONFIRMED | LedgerStatus.REJECTED,
    };
    this.events.emit(DomainEvent.SETTLEMENT_RESOLVED, payload);
    return this.toResponse(
      await this.entries.findOneOrFail({
        where: { id },
        relations: { createdBy: true, session: true },
      }),
      user.language,
    );
  }

  /** FOR UPDATE на рядок сім'ї: серіалізує всі грошові операції однієї сім'ї */
  private async lockFamily(manager: EntityManager, familyId: string): Promise<void> {
    await manager
      .getRepository(Family)
      .createQueryBuilder('f')
      .setLock('pessimistic_write')
      .select('f.id')
      .where('f.id = :familyId', { familyId })
      .getOneOrFail();
  }

  private toResponse(e: LedgerEntry, language: AppLanguage): LedgerEntryResponseDto {
    const exercise = e.exerciseRecord?.exercise;
    return {
      id: e.id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      sessionId: e.sessionId,
      sessionDate: e.session?.date ?? null,
      exerciseRecordId: e.exerciseRecordId,
      exerciseName: exercise ? (exercise.name[language] ?? exercise.name[AppLanguage.UK]) : null,
      exerciseSlug: exercise?.slug ?? null,
      createdBy: e.createdBy ? { id: e.createdBy.id, name: e.createdBy.name } : null,
      createdAt: e.createdAt,
      resolvedAt: e.resolvedAt,
    };
  }
}
