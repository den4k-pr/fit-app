import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  AppleNotificationDto,
  AppleVerifyDto,
  GoogleVerifyDto,
  SubscriptionResponseDto,
} from './dto';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Підписка (App Store / Google Play) — лише монетизація застосунку:
 * GET  /subscriptions/me                    стан підписки користувача
 * POST /subscriptions/apple                 перевірити покупку StoreKit 2 (JWS)
 * POST /subscriptions/google                перевірити покупку Google Play (purchaseToken)
 * POST /subscriptions/apple/notifications   @Public App Store Server Notifications V2
 * POST /subscriptions/google/rtdn?token=    @Public Google Play RTDN (Pub/Sub push)
 */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionResponseDto> {
    return this.subscriptions.getMine(user.id);
  }

  @Post('apple')
  @HttpCode(200)
  verifyApple(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AppleVerifyDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.verifyApple(user, dto.signedTransaction);
  }

  @Post('google')
  @HttpCode(200)
  verifyGoogle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GoogleVerifyDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.verifyGoogle(user, dto.productId, dto.purchaseToken);
  }

  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Post('apple/notifications')
  @HttpCode(HttpStatus.OK)
  async appleNotifications(@Body() dto: AppleNotificationDto): Promise<void> {
    await this.subscriptions.appleNotification(dto.signedPayload);
  }

  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Post('google/rtdn')
  @HttpCode(HttpStatus.OK)
  async googleRtdn(
    @Body() body: { message?: { data?: string } },
    @Query('token') token?: string,
  ): Promise<void> {
    await this.subscriptions.googleRtdn(body, token);
  }
}
