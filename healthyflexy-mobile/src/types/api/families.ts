import type { Currency, ExerciseMode, ParentDayState, RelationshipType, UserRole, WorkoutType } from '../enums';
import type { ISODate, ISODateTime, Money, TimeHHmm } from '../common';

/** POST /families/invites (лише дитина) */
export interface CreateInviteRequest {
  relationship: RelationshipType;
  /** Як дитина називатиме цього батька/матір у перемикачі («Мама») */
  parentLabel?: string;
  /** Стартова ставка за день */
  rate?: Money;
}
export interface Invite {
  /** 6 символів без 0 O 1 I L */
  code: string;
  /** healthyflexy://join/ABC234 */
  deepLink: string;
  relationship: RelationshipType;
  expiresAt: ISODateTime;
}

/** POST /families/join (лише батько/мати) */
export interface AcceptInviteRequest {
  code: string;
}

export interface FamilyMember {
  id: string;
  name: string | null;
  role: UserRole;
  /** Підписане посилання на фото-аватар; null — емодзі */
  avatarUrl: string | null;
}

/** GET /families/current */
export interface Family {
  id: string;
  relationship: RelationshipType;
  /** Як дитина називає батька/матір; null — ім'я з профілю */
  parentLabel: string | null;
  rate: Money;
  currency: Currency;
  /** ISO-дні занять: 1 = Пн … 7 = Нд */
  planDays: number[];
  reminderTime: TimeHHmm;
  /** «Види навантаження» */
  workoutTypes: WorkoutType[];
  /** «Час тренування», хв (без ходьби) */
  workoutMinutes: number;
  /** «Автоускладнення» */
  autoProgression: boolean;
  progressionPct: number;
  /** Підбір вправ: ШІ (за замовчуванням) або відмічені спонсором */
  exerciseMode: ExerciseMode;
  /** Відмічені спонсором вправи каталогу (режим «вручну») */
  selectedExerciseIds: string[];
  /** Рівень 1–5 */
  level: number;
  myRole: UserRole;
  counterpart: FamilyMember;
  createdAt: ISODateTime;
}

/** PATCH /families/current/plan (лише дитина; діє з наступного дня) */
export interface UpdatePlanRequest {
  planDays?: number[];
  rate?: Money;
  currency?: Currency;
  reminderTime?: TimeHHmm;
  workoutTypes?: WorkoutType[];
  workoutMinutes?: number;
  autoProgression?: boolean;
  progressionPct?: number;
  exerciseMode?: ExerciseMode;
  selectedExerciseIds?: string[];
}

/** PATCH /families/current (лише дитина): перейменувати батька/матір у перемикачі */
export interface UpdateFamilyRequest {
  parentLabel: string;
}

/** GET /families/current/stats */
export interface FamilyStats {
  currency: Currency;
  earnedTotal: Money;
  settledTotal: Money;
  pendingTotal: Money;
  /** earnedTotal − settledTotal: «Належить» */
  owed: Money;
  daysCompleted: number;
  daysMissed: number;
  /** 0–100 */
  completionPct: number;
  currentStreak: number;
  /** «Фонд»: скільки можна заробити за поточний місяць */
  monthFund: Money;
  /** Зароблено за активність у поточному місяці */
  monthEarned: Money;
  monthPlannedDays: number;
  monthCompletedDays: number;
  /** «Фонд»: усього закладено спонсором */
  fundDeposited?: Money;
  /** Залишок фонду */
  fundBalance?: Money;
  /** Витрата фонду за місяць, якщо виконувати всі заняття */
  fundMonthlyCost?: Money;
  /** На скільки місяців вистачить залишку (0.1) */
  fundMonths?: number;
  /** До якої дати фонд покриває заняття; null — фонд порожній */
  fundCoversUntil?: ISODate | null;
}

/** GET /families/current/parent-status (лише дитина) */
export interface ParentStatus {
  state: ParentDayState;
  parentName: string | null;
  parentLabel: string | null;
  parentAvatarUrl: string | null;
  localDate: ISODate;
  exercisesDone: number;
  exercisesTotal: number;
  lastCompletedDate: ISODate | null;
  canRemind: boolean;
  nextReminderAllowedAt: ISODateTime | null;
}

/** POST /families/current/reminders */
export interface ReminderResponse {
  sentAt: ISODateTime;
  nextAllowedAt: ISODateTime;
}
