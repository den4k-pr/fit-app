import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AutoTopupDto,
  AutoTopupResponseDto,
  CreateFundIntentDto,
  FundDepositStatusDto,
  FundIntentResponseDto,
  PaymentsConfigDto,
  PayoutLinkResponseDto,
  PayoutOnboardingDto,
  PayoutStatusResponseDto,
  SetupIntentResponseDto,
  WithdrawDto,
  WithdrawResponseDto,
} from './dto';
import { PaymentsService } from './payments.service';

/**
 * Реальні гроші (Stripe):
 * GET  /payments/config                         обидві ролі   чи підключено оплати, ключ для PaymentSheet
 * POST /payments/fund/intent                    @Roles(child) поповнити фонд (картка / Apple Pay / Google Pay / BLIK / PayPal)
 * GET  /payments/fund/intent/:paymentIntentId   @Roles(child) статус поповнення
 * POST /payments/auto-topup/setup-intent        @Roles(child) зберегти картку для автопоповнення
 * GET  /payments/auto-topup                     @Roles(child)
 * PUT  /payments/auto-topup                     @Roles(child) сума, щотижня/щомісяця, увімк./вимк.
 * POST /payments/payouts/onboarding             @Roles(parent) посилання Stripe: особа й рахунок для виплат
 * GET  /payments/payouts/status                 @Roles(parent) чи готові виплати, доступно до виведення
 * POST /payments/payouts/dashboard              @Roles(parent) кабінет Stripe Express
 * POST /payments/payouts/withdraw               @Roles(parent) вивести зароблене
 * GET  /payments/payouts/return                 @Public       повернення з онбордингу Stripe → у застосунок
 * POST /payments/webhooks/stripe                @Public       вебхук Stripe (підпис Stripe-Signature)
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('config')
  config(): PaymentsConfigDto {
    return this.payments.getConfig();
  }

  @Post('fund/intent')
  @Roles(UserRole.CHILD)
  createFundIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFundIntentDto,
  ): Promise<FundIntentResponseDto> {
    return this.payments.createFundIntent(user, dto.amount);
  }

  @Get('fund/intent/:paymentIntentId')
  @Roles(UserRole.CHILD)
  fundStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentIntentId') paymentIntentId: string,
  ): Promise<FundDepositStatusDto> {
    return this.payments.getFundDeposit(user, paymentIntentId);
  }

  @Post('auto-topup/setup-intent')
  @Roles(UserRole.CHILD)
  setupIntent(@CurrentUser() user: AuthenticatedUser): Promise<SetupIntentResponseDto> {
    return this.payments.createSetupIntent(user);
  }

  @Get('auto-topup')
  @Roles(UserRole.CHILD)
  getAutoTopup(@CurrentUser() user: AuthenticatedUser): Promise<AutoTopupResponseDto> {
    return this.payments.getAutoTopup(user);
  }

  @Put('auto-topup')
  @Roles(UserRole.CHILD)
  saveAutoTopup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AutoTopupDto,
  ): Promise<AutoTopupResponseDto> {
    return this.payments.saveAutoTopup(user, dto);
  }

  @Post('payouts/onboarding')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  onboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayoutOnboardingDto,
  ): Promise<PayoutLinkResponseDto> {
    return this.payments.createPayoutOnboarding(user, dto.country);
  }

  @Get('payouts/status')
  @Roles(UserRole.PARENT)
  payoutStatus(@CurrentUser() user: AuthenticatedUser): Promise<PayoutStatusResponseDto> {
    return this.payments.getPayoutStatus(user);
  }

  @Post('payouts/dashboard')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  dashboard(@CurrentUser() user: AuthenticatedUser): Promise<PayoutLinkResponseDto> {
    return this.payments.createPayoutDashboardLink(user);
  }

  @Post('payouts/withdraw')
  @HttpCode(200)
  @Roles(UserRole.PARENT)
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WithdrawDto,
  ): Promise<WithdrawResponseDto> {
    return this.payments.withdraw(user, dto.amount);
  }

  /** Stripe повертає сюди браузер після онбордингу → відкриваємо застосунок (deep link) */
  @Public()
  @ApiExcludeEndpoint()
  @Get('payouts/return')
  payoutReturn(@Query('state') state: string | undefined, @Res() res: Response): void {
    const safe = state === 'refresh' ? 'refresh' : 'done';
    res.redirect(302, `healthyflexy://payouts?state=${safe}`);
  }

  @Public()
  @SkipThrottle()
  @ApiExcludeEndpoint()
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    await this.payments.handleStripeWebhook(req.rawBody, signature);
    return { received: true };
  }
}
