import { IsNumber, IsPositive, Max } from 'class-validator';

/** POST /ledger/fund-deposits: лише role=child — поповнити «Фонд» (облік, без реального переказу) */
export class CreateFundDepositDto {
  /** Сума поповнення, 0.01–999 999.99 (фонд можна закласти навіть на десятки років уперед) */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999.99)
  amount: number;
}
