import { AppLanguage } from '../../common/enums';

/** Push-події сервера (розділ 9.1 ТЗ). Подія №1 «Час для вправ» — локальна, на пристрої батька/матері. */
export enum PushEventType {
  PARENT_DAY_COMPLETED = 'parent_day_completed',
  REMINDER_FROM_CHILD = 'reminder_from_child',
  SETTLEMENT_CREATED = 'settlement_created',
  SETTLEMENT_CONFIRMED = 'settlement_confirmed',
  SETTLEMENT_REJECTED = 'settlement_rejected',
}

/** Куди відкрити застосунок по тапу на сповіщення (дзеркало у мобільному `types/notifications.ts`) */
export type PushScreen = 'child.dashboard' | 'parent.today' | 'parent.history' | 'child.profile';

export interface PushData {
  event: PushEventType;
  screen: PushScreen;
  familyId: string;
}

/** Повідомлення для Expo Push API */
export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

/** Контекст для шаблону: мова одержувача + змінні */
export interface PushTemplateContext {
  language: AppLanguage;
  /** Ім'я тієї людини, про яку/від якої повідомлення */
  actorName: string | null;
  /** Форма дієслова за зв'язком: f (мама, бабуся), m (тато, дідусь), n (інше) */
  gender: 'f' | 'm' | 'n';
  /** Мама / Тато / Бабуся / … (локалізовано) */
  relationshipLabel: string;
  /** Уже відформатована сума з валютою, напр. «€30» */
  amountLabel?: string;
}
