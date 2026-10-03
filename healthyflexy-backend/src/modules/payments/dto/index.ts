import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Currency, FundDepositStatus, LedgerStatus, TopupInterval } from '../../../common/enums';

const MONEY = { maxDecimalPlaces: 2 };

/** GET /payments/config: чи підключено Stripe і що потрібно PaymentSheet */
export class PaymentsConfigDto {
  enabled: boolean;
  publishableKey: string | null;
  /** Країна продавця для Apple Pay / Google Pay */
  merchantCountry: string;
  merchantName: string;
  topupMin: number;
  topupMax: number;
}

/** POST /payments/fund/intent (спонсор): сума поповнення у валюті сім'ї */
export class CreateFundIntentDto {
  @Type(() => Number)
  @IsNumber(MONEY)
  @Min(2)
  @Max(999999.99)
  amount: number;
}

/** Дані для PaymentSheet (режим оплати) */
export class FundIntentResponseDto {
  paymentIntentId: string;
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
  amount: number;
  currency: Currency;
}

export class FundDepositStatusDto {
  status: FundDepositStatus;
  amount: number;
}

/** Дані для PaymentSheet (режим збереження картки для автопоповнення) */
export class SetupIntentResponseDto {
  setupIntentId: string;
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
}

/** PUT /payments/auto-topup (спонсор) */
export class AutoTopupDto {
  @Type(() => Number)
  @IsNumber(MONEY)
  @Min(2)
  @Max(99999.99)
  amount: number;

  @IsEnum(TopupInterval)
  interval: TopupInterval;

  @IsBoolean()
  active: boolean;
}

export class AutoTopupResponseDto {
  active: boolean;
  amount: number | null;
  interval: TopupInterval | null;
  nextRunAt: Date | null;
  /** Причина останнього невдалого списання (напр. картку відхилено) */
  lastError: string | null;
  currency: Currency;
  /** Збережена картка: лише бренд і останні 4 цифри */
  card: { brand: string | null; last4: string } | null;
}

/** POST /payments/payouts/onboarding (батько/мати) */
export class PayoutOnboardingDto {
  /** Країна рахунку (ISO 3166-1 alpha-2), якщо відрізняється від країни номера телефону */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  country?: string;
}

export class PayoutLinkResponseDto {
  /** Одноразове посилання Stripe (відкрити в браузері) */
  url: string;
}

export class PayoutStatusResponseDto {
  /** Stripe підключено на сервері */
  enabled: boolean;
  /** Акаунт для виплат створено */
  connected: boolean;
  detailsSubmitted: boolean;
  /** Stripe дозволив виплати — можна виводити */
  payoutsEnabled: boolean;
  /** Доступно до виведення: min(зароблене − виплачене − очікує, реально оплачене у фонд через Stripe) */
  available: number;
  /** Реальні гроші сім'ї на рахунку платформи */
  heldFunds: number;
  currency: Currency;
}

/** POST /payments/payouts/withdraw (батько/мати) */
export class WithdrawDto {
  @Type(() => Number)
  @IsNumber(MONEY)
  @Min(1)
  @Max(99999.99)
  amount: number;
}

export class WithdrawResponseDto {
  ledgerId: string;
  amount: number;
  currency: Currency;
  status: LedgerStatus;
}
