import type { Currency, LedgerStatus, LedgerType } from '../enums';
import type { ISODate, ISODateTime, Money } from '../common';

export interface LedgerActor {
  id: string;
  name: string | null;
}

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  /** завжди > 0; знак визначає тип */
  amount: Money;
  currency: Currency;
  status: LedgerStatus;
  sessionId: string | null;
  /** для earn: дата дня */
  sessionDate: ISODate | null;
  /** для earn: за яку вправу (null — старі записи «за день») */
  exerciseRecordId: string | null;
  exerciseName: string | null;
  exerciseSlug: string | null;
  createdBy: LedgerActor | null;
  createdAt: ISODateTime;
  resolvedAt: ISODateTime | null;
}

/** GET /ledger */
export interface LedgerListQuery {
  cursor?: string;
  /** 1–50, за замовчуванням 20 */
  limit?: number;
  type?: LedgerType;
}
export interface LedgerListResponse {
  items: LedgerEntry[];
  nextCursor: string | null;
}

/** POST /ledger/settlements (лише дитина) */
export interface CreateSettlementRequest {
  amount: Money;
}

/** POST /ledger/fund-deposits (лише спонсор): поповнити «Фонд» — облік, без реального переказу */
export interface CreateFundDepositRequest {
  amount: Money;
}
export interface FundDeposit {
  id: string;
  amount: Money;
  currency: Currency;
  createdAt: ISODateTime;
}

/** POST /ledger/settlements/:id/resolve (лише батько/мати) */
export interface ResolveSettlementRequest {
  /** true = «Так, отримано», false = «Ні, не отримано» */
  accept: boolean;
}
