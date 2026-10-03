import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyContextModule } from '../families/family-context.module';
import { BalanceService } from './balance.service';
import { FundDeposit } from './entities/fund-deposit.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry, FundDeposit]), FamilyContextModule],
  controllers: [LedgerController],
  providers: [LedgerService, BalanceService],
  exports: [BalanceService],
})
export class LedgerModule {}
