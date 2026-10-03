import { IsEnum, IsOptional } from 'class-validator';
import { LedgerType } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** GET /ledger?cursor=&limit=&type= */
export class LedgerListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LedgerType)
  type?: LedgerType;
}
