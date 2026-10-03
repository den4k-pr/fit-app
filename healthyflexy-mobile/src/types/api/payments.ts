import type { Currency } from '../enums';
import type { ISODateTime, Money } from '../common';

/** GET /payments/config */
export interface PaymentsConfig {
  enabled: boolean;
  publishableKey: string | null;
  merchantCountry: string;
  merchantName: string;
  topupMin: Money;
  topupMax: Money;
}

/** POST /payments/fund/intent → дані для PaymentSheet */
export interface FundIntent {
  paymentIntentId: string;
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
  amount: Money;
  currency: Currency;
}

export type FundDepositStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | 'disputed';

export interface SetupIntent {
  setupIntentId: string;
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
}

export type TopupInterval = 'week' | 'month';

export interface AutoTopup {
  active: boolean;
  amount: Money | null;
  interval: TopupInterval | null;
  nextRunAt: ISODateTime | null;
  lastError: string | null;
  currency: Currency;
  card: { brand: string | null; last4: string } | null;
}

export interface PayoutStatus {
  enabled: boolean;
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  /** Доступно до виведення */
  available: Money;
  heldFunds: Money;
  currency: Currency;
}
