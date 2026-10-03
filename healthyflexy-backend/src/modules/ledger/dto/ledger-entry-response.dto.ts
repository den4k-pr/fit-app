import { Currency, LedgerStatus, LedgerType } from '../../../common/enums';

export class LedgerActorDto {
  id: string;
  name: string | null;
}

export class LedgerEntryResponseDto {
  id: string;
  type: LedgerType;

  /** Завжди > 0; знак визначається типом */
  amount: number;
  currency: Currency;
  status: LedgerStatus;

  /** Для earn: id дня */
  sessionId: string | null;

  /** Для earn: дата дня, YYYY-MM-DD («День виконано · Вт, 15 вер») */
  sessionDate: string | null;

  /** Для earn: за яку вправу нараховано (null — старі записи «за день») */
  exerciseRecordId: string | null;

  /** Для earn: назва вправи мовою користувача */
  exerciseName: string | null;
  exerciseSlug: string | null;

  /** Для settlement: хто створив (дитина) */
  createdBy: LedgerActorDto | null;
  createdAt: Date;
  resolvedAt: Date | null;
}
