import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLanguage, Currency, LedgerStatus, RelationshipType } from '../../common/enums';
import {
  DayCompletedEvent,
  DomainEvent,
  ReminderRequestedEvent,
  SettlementCreatedEvent,
  SettlementResolvedEvent,
} from '../../common/events/domain-events';
import { Family } from '../families/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { PushEventType, PushMessage, PushScreen, PushTemplateContext } from './notifications.types';
import { PUSH_TEMPLATES } from './push-templates';
import { PushService } from './push.service';

const GENDER: Record<RelationshipType, 'f' | 'm' | 'n'> = {
  [RelationshipType.MOM]: 'f',
  [RelationshipType.GRANDMA]: 'f',
  [RelationshipType.DAD]: 'm',
  [RelationshipType.GRANDPA]: 'm',
  [RelationshipType.OTHER]: 'n',
};

const RELATIONSHIP_LABEL: Record<AppLanguage, Record<RelationshipType, string>> = {
  [AppLanguage.UK]: {
    mom: 'Мама',
    dad: 'Тато',
    grandma: 'Бабуся',
    grandpa: 'Дідусь',
    other: 'Батьки',
  },
  [AppLanguage.PL]: {
    mom: 'Mama',
    dad: 'Tata',
    grandma: 'Babcia',
    grandpa: 'Dziadek',
    other: 'Rodzic',
  },
  [AppLanguage.EN]: {
    mom: 'Mom',
    dad: 'Dad',
    grandma: 'Grandma',
    grandpa: 'Grandpa',
    other: 'Parent',
  },
  [AppLanguage.RU]: {
    mom: 'Мама',
    dad: 'Папа',
    grandma: 'Бабушка',
    grandpa: 'Дедушка',
    other: 'Родители',
  },
};

/**
 * Слухає доменні події й шле push (ТЗ §9.1). Текст — мовою ОДЕРЖУВАЧА.
 * Помилка сповіщення ніколи не ламає основну дію (усе в try/catch).
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly push: PushService,
    @InjectRepository(Family) private readonly families: Repository<Family>,
  ) {}

  @OnEvent(DomainEvent.DAY_COMPLETED)
  onDayCompleted(e: DayCompletedEvent): Promise<void> {
    return this.safely(async () => {
      const family = await this.familyOf(e.familyId);
      await this.notify(
        family.child,
        family.parent,
        family,
        PushEventType.PARENT_DAY_COMPLETED,
        'child.dashboard',
      );
    });
  }

  @OnEvent(DomainEvent.REMINDER_REQUESTED)
  onReminder(e: ReminderRequestedEvent): Promise<void> {
    return this.safely(async () => {
      const family = await this.familyOf(e.familyId);
      await this.notify(
        family.parent,
        family.child,
        family,
        PushEventType.REMINDER_FROM_CHILD,
        'parent.today',
      );
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_CREATED)
  onSettlementCreated(e: SettlementCreatedEvent): Promise<void> {
    return this.safely(async () => {
      const family = await this.familyOf(e.familyId);
      await this.notify(
        family.parent,
        family.child,
        family,
        PushEventType.SETTLEMENT_CREATED,
        'parent.history',
        e.amount,
        e.currency,
      );
    });
  }

  @OnEvent(DomainEvent.SETTLEMENT_RESOLVED)
  onSettlementResolved(e: SettlementResolvedEvent): Promise<void> {
    return this.safely(async () => {
      const family = await this.familyOf(e.familyId);
      const type =
        e.status === LedgerStatus.CONFIRMED
          ? PushEventType.SETTLEMENT_CONFIRMED
          : PushEventType.SETTLEMENT_REJECTED;
      await this.notify(
        family.child,
        family.parent,
        family,
        type,
        'child.dashboard',
        e.amount,
        e.currency,
      );
    });
  }

  private async notify(
    recipient: User,
    actor: User,
    family: Family,
    event: PushEventType,
    screen: PushScreen,
    amount?: number,
    currency?: string,
  ): Promise<void> {
    const language = recipient.language;
    const ctx: PushTemplateContext = {
      language,
      actorName: actor.name,
      gender: GENDER[family.relationship],
      relationshipLabel: RELATIONSHIP_LABEL[language][family.relationship],
      amountLabel:
        amount === undefined ? undefined : formatAmount(amount, currency as Currency, language),
    };
    const { title, body } = PUSH_TEMPLATES[language][event](ctx);
    const message: Omit<PushMessage, 'to'> = {
      title,
      body,
      data: { event, screen, familyId: family.id },
      sound: 'default',
      priority: 'high',
    };
    const sent = await this.push.sendToUser(recipient.id, message);
    this.logger.log({ event: 'push', type: event, recipientId: recipient.id, sent });
  }

  private familyOf(id: string): Promise<Family> {
    return this.families.findOneOrFail({ where: { id }, relations: { parent: true, child: true } });
  }

  private async safely(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error({ event: 'notification_failed', reason: String(error) });
    }
  }
}

function formatAmount(amount: number, currency: Currency, language: AppLanguage): string {
  const value = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(amount);
  return currency === Currency.EUR ? `€${value}` : `${value} zł`;
}
