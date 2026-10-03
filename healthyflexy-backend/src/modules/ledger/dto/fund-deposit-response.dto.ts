import { Currency } from '../../../common/enums';

export class FundDepositResponseDto {
  id: string;
  amount: number;
  currency: Currency;
  createdAt: Date;
}
