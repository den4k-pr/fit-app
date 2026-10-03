import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from '../families/entities/family.entity';
import { FamilyContextModule } from '../families/family-context.module';
import { FundDeposit } from '../ledger/entities/fund-deposit.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { User } from '../users/entities/user.entity';
import { AutoTopupTask } from './auto-topup.task';
import { AutoTopup } from './entities/auto-topup.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { STRIPE_CLIENT, createStripeClient } from './stripe.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentAccount,
      AutoTopup,
      PaymentWebhookEvent,
      FundDeposit,
      LedgerEntry,
      Family,
      User,
    ]),
    FamilyContextModule,
    LedgerModule,
  ],
  controllers: [PaymentsController],
  providers: [
    { provide: STRIPE_CLIENT, inject: [ConfigService], useFactory: createStripeClient },
    PaymentsService,
    AutoTopupTask,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
