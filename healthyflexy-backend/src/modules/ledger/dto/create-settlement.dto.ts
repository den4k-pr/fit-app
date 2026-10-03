import { IsNumber, IsPositive, Max } from 'class-validator';

/** POST /ledger/settlements: лише role=child («Переказ зроблено») */
export class CreateSettlementDto {
  /**
   * Сума переказу, 0.01–99999.99. Не може перевищувати `owed − pending`
   * (перевіряє сервер → SETTLEMENT_EXCEEDS_OWED).
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999.99)
  amount: number;
}
