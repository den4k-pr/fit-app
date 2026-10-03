/** Хто провів гроші: облікове поповнення / переказ поза застосунком (`manual`) або Stripe */
export enum PaymentProvider {
  MANUAL = 'manual',
  STRIPE = 'stripe',
}

/** Статус поповнення фонду. У залишок фонду входять лише `succeeded`. */
export enum FundDepositStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

/** Як виплачено батькові: поза застосунком (підтверджує батько/мати) або Stripe Connect (автоматично) */
export enum SettlementMethod {
  MANUAL = 'manual',
  STRIPE = 'stripe',
}

export enum TopupInterval {
  WEEK = 'week',
  MONTH = 'month',
}

export enum SubscriptionPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

/** Нормалізований статус підписки App Store / Google Play. Доступ дають `active`, `grace`, `canceled` (до кінця періоду). */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  GRACE = 'grace',
  ON_HOLD = 'on_hold',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending',
}
