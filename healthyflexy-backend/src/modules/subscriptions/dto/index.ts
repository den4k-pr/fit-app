import { IsString, MaxLength, MinLength } from 'class-validator';
import { SubscriptionPlatform, SubscriptionStatus } from '../../../common/enums';

/** POST /subscriptions/apple: StoreKit 2 `Transaction.jwsRepresentation` */
export class AppleVerifyDto {
  @IsString()
  @MinLength(20)
  @MaxLength(20000)
  signedTransaction: string;
}

/** POST /subscriptions/apple/notifications: App Store Server Notifications V2 */
export class AppleNotificationDto {
  @IsString()
  @MinLength(20)
  @MaxLength(100000)
  signedPayload: string;
}

/** POST /subscriptions/google: дані покупки з Google Play Billing */
export class GoogleVerifyDto {
  @IsString()
  @MaxLength(200)
  productId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  purchaseToken: string;
}

export class SubscriptionResponseDto {
  /** Є доступ (активна, пільговий період або скасована до кінця періоду) */
  active: boolean;
  platform: SubscriptionPlatform | null;
  productId: string | null;
  status: SubscriptionStatus | null;
  expiresAt: Date | null;
  autoRenew: boolean;
}
