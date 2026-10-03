import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { createAppleVerifier } from './apple-verifier';
import { Subscription } from './entities/subscription.entity';
import { GooglePlayClient } from './google-play.client';
import { SubscriptionsController } from './subscriptions.controller';
import { APPLE_VERIFIER, SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User])],
  controllers: [SubscriptionsController],
  providers: [
    { provide: APPLE_VERIFIER, inject: [ConfigService], useFactory: createAppleVerifier },
    GooglePlayClient,
    SubscriptionsService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
