import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateFundDepositDto,
  CreateSettlementDto,
  FundDepositResponseDto,
  LedgerEntryResponseDto,
  LedgerListQueryDto,
  LedgerListResponseDto,
  ResolveSettlementDto,
} from './dto';
import { LedgerService } from './ledger.service';

/**
 * GET  /ledger?cursor=&limit=&type=           обидві ролі
 * POST /ledger/settlements                    @Roles(child)
 * POST /ledger/fund-deposits                  @Roles(child)  поповнити «Фонд»
 * POST /ledger/settlements/:id/resolve        @Roles(parent)
 */
@ApiTags('ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LedgerListQueryDto,
  ): Promise<LedgerListResponseDto> {
    return this.ledger.list(user, query);
  }

  @Post('settlements')
  @Roles(UserRole.CHILD)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSettlementDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledger.createSettlement(user, dto);
  }

  @Post('fund-deposits')
  @Roles(UserRole.CHILD)
  deposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFundDepositDto,
  ): Promise<FundDepositResponseDto> {
    return this.ledger.createFundDeposit(user, dto);
  }

  @Post('settlements/:id/resolve')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSettlementDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledger.resolveSettlement(user, id, dto);
  }
}
