import { LedgerEntryResponseDto } from './ledger-entry-response.dto';

/** Нові записи першими; курсор = createdAt + id */
export class LedgerListResponseDto {
  items: LedgerEntryResponseDto[];

  /** null — більше сторінок немає */
  nextCursor: string | null;
}
