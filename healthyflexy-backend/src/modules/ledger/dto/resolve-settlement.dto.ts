import { IsBoolean } from 'class-validator';

/** POST /ledger/settlements/:id/resolve: лише role=parent */
export class ResolveSettlementDto {
  /** true = «Так, отримано» (confirmed), false = «Ні, не отримано» (rejected) */
  @IsBoolean()
  accept: boolean;
}
