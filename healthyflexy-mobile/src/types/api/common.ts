/**
 * Формат помилки бекенду (`ErrorResponseDto`). Тексти для користувача беремо з i18n за `code`,
 * а не з `message` (він технічний).
 */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthorized: 'UNAUTHORIZED',
  TokenExpired: 'TOKEN_EXPIRED',
  RefreshTokenInvalid: 'REFRESH_TOKEN_INVALID',
  ForbiddenRole: 'FORBIDDEN_ROLE',
  NotFound: 'NOT_FOUND',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  InternalError: 'INTERNAL_ERROR',

  OtpInvalid: 'OTP_INVALID',
  OtpExpired: 'OTP_EXPIRED',
  OtpTooManyAttempts: 'OTP_TOO_MANY_ATTEMPTS',
  OtpCooldown: 'OTP_COOLDOWN',
  OtpSendFailed: 'OTP_SEND_FAILED',
  PhoneCountryNotAllowed: 'PHONE_COUNTRY_NOT_ALLOWED',
  PhoneNotAllowed: 'PHONE_NOT_ALLOWED',
  SmsNotConfigured: 'SMS_NOT_CONFIGURED',
  GoogleAuthFailed: 'GOOGLE_AUTH_FAILED',
  GoogleAuthDisabled: 'GOOGLE_AUTH_DISABLED',
  AiAttemptsLimit: 'AI_ATTEMPTS_LIMIT',
  PaymentsDisabled: 'PAYMENTS_DISABLED',
  PaymentFailed: 'PAYMENT_FAILED',
  PaymentMethodRequired: 'PAYMENT_METHOD_REQUIRED',
  PayoutsNotReady: 'PAYOUTS_NOT_READY',
  PayoutExceedsAvailable: 'PAYOUT_EXCEEDS_AVAILABLE',
  IapDisabled: 'IAP_DISABLED',
  IapInvalid: 'IAP_INVALID',

  RoleAlreadySet: 'ROLE_ALREADY_SET',
  RoleRequired: 'ROLE_REQUIRED',
  ConsentRequired: 'CONSENT_REQUIRED',

  InviteInvalid: 'INVITE_INVALID',
  InviteExpired: 'INVITE_EXPIRED',
  InviteUsed: 'INVITE_USED',
  AlreadyInFamily: 'ALREADY_IN_FAMILY',
  FamilyNotFound: 'FAMILY_NOT_FOUND',
  NotFamilyMember: 'NOT_FAMILY_MEMBER',
  PlanInvalid: 'PLAN_INVALID',

  RestDay: 'REST_DAY',
  DayAlreadyClosed: 'DAY_ALREADY_CLOSED',
  ExerciseOutOfOrder: 'EXERCISE_OUT_OF_ORDER',
  ExerciseAlreadyDone: 'EXERCISE_ALREADY_DONE',
  PhotoKeyInvalid: 'PHOTO_KEY_INVALID',
  PhotoTooLarge: 'PHOTO_TOO_LARGE',
  PhotoTypeNotAllowed: 'PHOTO_TYPE_NOT_ALLOWED',
  PhotosDeleted: 'PHOTOS_DELETED',
  PhotosNotAvailable: 'PHOTOS_NOT_AVAILABLE',
  StorageSignatureInvalid: 'STORAGE_SIGNATURE_INVALID',

  SettlementExceedsOwed: 'SETTLEMENT_EXCEEDS_OWED',
  SettlementNotPending: 'SETTLEMENT_NOT_PENDING',
  NothingOwed: 'NOTHING_OWED',

  ReminderTooSoon: 'REMINDER_TOO_SOON',
  ReminderNotAllowed: 'REMINDER_NOT_ALLOWED',
  ParentHasNoPush: 'PARENT_HAS_NO_PUSH',

  ProgramNotFound: 'PROGRAM_NOT_FOUND',
  ProgramNotOwned: 'PROGRAM_NOT_OWNED',
  ProgramExercisesEmpty: 'PROGRAM_EXERCISES_EMPTY',
  NoActiveProgram: 'NO_ACTIVE_PROGRAM',
  AiAnalysisFailed: 'AI_ANALYSIS_FAILED',
  PhotosRequired: 'PHOTOS_REQUIRED',
  StepsNotReached: 'STEPS_NOT_REACHED',
  ProgramTooManyExercises: 'PROGRAM_TOO_MANY_EXERCISES',
  AccountBlocked: 'ACCOUNT_BLOCKED',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Тіло відповіді з помилкою */
export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  /** Поле → список порушень (для VALIDATION_FAILED) */
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

/** `{ success: true }` */
export interface SuccessResponse {
  success: boolean;
}
