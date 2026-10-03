/** Дзеркало backend `notifications.types.ts`. Локальне нагадування «Час для вправ» шле сам застосунок. */
export const PushEventType = {
  ParentDayCompleted: 'parent_day_completed',
  ReminderFromChild: 'reminder_from_child',
  SettlementCreated: 'settlement_created',
  SettlementConfirmed: 'settlement_confirmed',
  SettlementRejected: 'settlement_rejected',
  /** лише локальне, на пристрої батька/матері */
  LocalDailyReminder: 'local_daily_reminder',
} as const;
export type PushEventType = (typeof PushEventType)[keyof typeof PushEventType];

/** Куди відкрити застосунок по тапу на сповіщення */
export type PushScreen = 'child.dashboard' | 'parent.today' | 'parent.history' | 'child.profile';

/** Поле `data` у push-повідомленні */
export interface PushData {
  event: PushEventType;
  screen: PushScreen;
  familyId?: string;
}
