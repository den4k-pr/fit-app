/**
 * Дзеркало backend `src/common/enums`. Значення — рядки, як у JSON API.
 * Патерн «const-об'єкт + union-тип»: `UserRole.Parent` як значення і `UserRole` як тип.
 */

/** Роль (обирається один раз). */
export const UserRole = {
  Parent: 'parent',
  Child: 'child',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Ким батько/мати приходиться дитині. */
export const RelationshipType = {
  Mom: 'mom',
  Dad: 'dad',
  Grandma: 'grandma',
  Grandpa: 'grandpa',
  Other: 'other',
} as const;
export type RelationshipType = (typeof RelationshipType)[keyof typeof RelationshipType];

/** Статус дня. */
export const SessionStatus = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Completed: 'completed',
  Missed: 'missed',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

/** Нарахування за день або переказ. */
export const LedgerType = {
  Earn: 'earn',
  Settlement: 'settlement',
} as const;
export type LedgerType = (typeof LedgerType)[keyof typeof LedgerType];

/** Статус запису обліку. */
export const LedgerStatus = {
  Confirmed: 'confirmed',
  Pending: 'pending',
  Rejected: 'rejected',
} as const;
export type LedgerStatus = (typeof LedgerStatus)[keyof typeof LedgerStatus];

/** Категорія вправи. */
export const ExerciseCategory = {
  Strength: 'strength',
  Cardio: 'cardio',
  Balance: 'balance',
  Breathing: 'breathing',
  /** Суглобова гімнастика — гериатричні пресети */
  JointMobility: 'joint_mobility',
  Stretch: 'stretch',
} as const;
export type ExerciseCategory = (typeof ExerciseCategory)[keyof typeof ExerciseCategory];

/** Тривалість програми тренувань. */
export const ProgramDurationType = {
  Week: 'week',
  Month: 'month',
} as const;
export type ProgramDurationType = (typeof ProgramDurationType)[keyof typeof ProgramDurationType];

/** Мови інтерфейсу v1. */
export const AppLanguage = {
  Ru: 'ru',
  Uk: 'uk',
  Pl: 'pl',
  En: 'en',
} as const;
export type AppLanguage = (typeof AppLanguage)[keyof typeof AppLanguage];

/** Валюта обліку (лише мітка). */
export const Currency = {
  Eur: 'EUR',
  Pln: 'PLN',
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

/** Стан вправи в списку «Сьогодні». */
export const ExerciseState = {
  Done: 'done',
  /** Пропущено (не вдалося / не зараховано) — без оплати */
  Skipped: 'skipped',
  Current: 'current',
  Locked: 'locked',
} as const;
export type ExerciseState = (typeof ExerciseState)[keyof typeof ExerciseState];

/** Платформа пристрою. */
export const DevicePlatform = {
  Ios: 'ios',
  Android: 'android',
} as const;
export type DevicePlatform = (typeof DevicePlatform)[keyof typeof DevicePlatform];

/** Стан клітинки календаря. */
export const CalendarDayStatus = {
  Completed: 'completed',
  Missed: 'missed',
  InProgress: 'in_progress',
  Pending: 'pending',
  Planned: 'planned',
  Rest: 'rest',
} as const;
export type CalendarDayStatus = (typeof CalendarDayStatus)[keyof typeof CalendarDayStatus];

/** Статус батька/матері сьогодні (дашборд дитини). */
export const ParentDayState = {
  Completed: 'completed',
  InProgress: 'in_progress',
  NotStarted: 'not_started',
  RestDay: 'rest_day',
} as const;
export type ParentDayState = (typeof ParentDayState)[keyof typeof ParentDayState];

/** Вид навантаження («План → Види навантаження»); дзеркало backend `WorkoutType` */
export const WorkoutType = {
  Strength: 'strength',
  Cardio: 'cardio',
  Morning: 'morning',
  Stretch: 'stretch',
  Warmup: 'warmup',
  Breathing: 'breathing',
  Walking: 'walking',
  Meditation: 'meditation',
  Coordination: 'coordination',
} as const;
export type WorkoutType = (typeof WorkoutType)[keyof typeof WorkoutType];
export const ALL_WORKOUT_TYPES: WorkoutType[] = Object.values(WorkoutType);

/** Ритм голосового супроводу вправи (дзеркало бекенду `VoicePattern`) */
export const VoicePattern = {
  Squat: 'squat',
  Lunge: 'lunge',
  Push: 'push',
  Bridge: 'bridge',
  Raise: 'raise',
  Reach: 'reach',
  Twist: 'twist',
  Fold: 'fold',
  March: 'march',
  Jacks: 'jacks',
  Circle: 'circle',
  Hold: 'hold',
  Breath: 'breath',
  Steps: 'steps',
} as const;
export type VoicePattern = (typeof VoicePattern)[keyof typeof VoicePattern];

/** Підбір вправ дня (обирає спонсор у «Вправах»): ШІ або відмічені вправи. */
export const ExerciseMode = {
  Ai: 'ai',
  Manual: 'manual',
} as const;
export type ExerciseMode = (typeof ExerciseMode)[keyof typeof ExerciseMode];
