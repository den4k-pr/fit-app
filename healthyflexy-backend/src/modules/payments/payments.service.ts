import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import {
  FundDepositStatus,
  LedgerStatus,
  LedgerType,
  PaymentProvider,
  SettlementMethod,
  TopupInterval,
} from '../../common/enums';
import { DomainEvent, SettlementResolvedEvent } from '../../common/events/domain-events';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { roundMoney, toCents } from '../../common/utils/money.util';
import { EnvironmentVariables } from '../../config';
import { Family } from '../families/entities/family.entity';
import { FamilyContextService } from '../families/family-context.service';
import { BalanceService } from '../ledger/balance.service';
import { FundDeposit } from '../ledger/entities/fund-deposit.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { User } from '../users/entities/user.entity';
import {
  AutoTopupDto,
  AutoTopupResponseDto,
  FundIntentResponseDto,
  PaymentsConfigDto,
  PayoutLinkResponseDto,
  PayoutStatusResponseDto,
  SetupIntentResponseDto,
  WithdrawResponseDto,
} from './dto';
import { AutoTopup } from './entities/auto-topup.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { STRIPE_API_VERSION, STRIPE_CLIENT, fromMinor, toMinor } from './stripe.client';

/** Мітка в metadata PaymentIntent: це поповнення фонду сім'ї (інших платежів поки немає) */
const KIND_FUND_TOPUP = 'fund_topup';
/** Невдалих автосписань поспіль, після яких автопоповнення вимикається */
export const AUTO_TOPUP_MAX_FAILURES = 3;
/** Через скільки повторити невдале автосписання */
const AUTO_TOPUP_RETRY_MS = 24 * 3600_000;
/** Межі однієї оплати: мінімум Stripe для EUR/PLN з запасом; максимум — як у ручного поповнення */
export const TOPUP_MIN = 2;
export const TOPUP_MAX = 999_999.99;

/**
 * Реальні гроші через Stripe (ТЗ §20.1, макет замовника).
 *
 *  ПОПОВНЕННЯ ФОНДУ (спонсор): PaymentIntent з automatic_payment_methods — Stripe сам показує в PaymentSheet
 *  доступні способи: картка, Apple Pay, Google Pay, BLIK (лише PLN), PayPal (вмикаються в Dashboard).
 *  Запис `fund_deposits` створюється `pending`; `succeeded` — ЛИШЕ за підтвердженням Stripe (вебхук або перевірка
 *  PaymentIntent на сервері), клієнту не віримо.
 *
 *  АВТОПОПОВНЕННЯ: SetupIntent зберігає картку (off_session) → cron списує суму щотижня/щомісяця.
 *
 *  ВИПЛАТА БАТЬКОВІ: Stripe Connect Express — Stripe перевіряє особу (KYC) і сам виплачує на рахунок/картку.
 *  Виплата = Transfer з балансу платформи на Connect-акаунт; сума ≤ (зароблене − виплачене − очікує) і
 *  ≤ реально оплачене у фонд через Stripe. BLIK — лише спосіб ОПЛАТИ: виплат через BLIK Stripe не підтримує.
 *
 *  Через IAP App Store / Google Play ці гроші НЕ йдуть: це передача реальних грошей між людьми (не цифровий товар).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripeClient: Stripe | null,
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentAccount) private readonly accounts: Repository<PaymentAccount>,
    @InjectRepository(FundDeposit) private readonly deposits: Repository<FundDeposit>,
    @InjectRepository(AutoTopup) private readonly topups: Repository<AutoTopup>,
    @InjectRepository(PaymentWebhookEvent)
    private readonly webhookEvents: Repository<PaymentWebhookEvent>,
    @InjectRepository(LedgerEntry) private readonly ledger: Repository<LedgerEntry>,
    @InjectRepository(Family) private readonly families: Repository<Family>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly context: FamilyContextService,
    private readonly balance: BalanceService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly events: EventEmitter2,
  ) {}

  get enabled(): boolean {
    return this.stripeClient !== null;
  }

  private get stripe(): Stripe {
    if (!this.stripeClient)
      throw new AppException(ErrorCode.PAYMENTS_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    return this.stripeClient;
  }

  getConfig(): PaymentsConfigDto {
    return {
      enabled: this.enabled,
      publishableKey: this.enabled
        ? (this.config.get('STRIPE_PUBLISHABLE_KEY', { infer: true }) ?? null)
        : null,
      merchantCountry: this.config.get('STRIPE_MERCHANT_COUNTRY', { infer: true }),
      merchantName: this.config.get('STRIPE_MERCHANT_NAME', { infer: true }),
      topupMin: TOPUP_MIN,
      topupMax: TOPUP_MAX,
    };
  }

  // ═════════════════════════ поповнення фонду ═════════════════════════

  /** PaymentIntent для PaymentSheet + запис поповнення `pending` */
  async createFundIntent(user: AuthenticatedUser, amount: number): Promise<FundIntentResponseDto> {
    const stripe = this.stripe;
    const family = await this.context.requireFamilyFor(user.id);
    const value = roundMoney(amount);
    if (value < TOPUP_MIN || value > TOPUP_MAX)
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'amount out of range',
      );
    const account = await this.ensureCustomer(user.id);
    const customerId = account.stripeCustomerId as string;

    const intent = await this.call(() =>
      stripe.paymentIntents.create(
        {
          amount: toMinor(value),
          currency: family.currency.toLowerCase(),
          customer: customerId,
          automatic_payment_methods: { enabled: true },
          description: `Fund top-up ${family.id}`,
          metadata: { kind: KIND_FUND_TOPUP, familyId: family.id, userId: user.id },
        },
        { idempotencyKey: `fund-intent:${randomUUID()}` },
      ),
    );
    await this.deposits.save(
      this.deposits.create({
        familyId: family.id,
        amount: value,
        currency: family.currency,
        createdById: user.id,
        provider: PaymentProvider.STRIPE,
        status: FundDepositStatus.PENDING,
        providerPaymentId: intent.id,
      }),
    );
    const ephemeralKey = await this.call(() =>
      stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: STRIPE_API_VERSION }),
    );
    this.logger.log({
      event: 'fund_intent_created',
      familyId: family.id,
      intent: intent.id,
      amount: value,
    });
    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret as string,
      customerId,
      ephemeralKey: ephemeralKey.secret as string,
      amount: value,
      currency: family.currency,
    };
  }

  /**
   * Статус поповнення для застосунку (після PaymentSheet). Якщо вебхук ще не дійшов — сервер сам питає Stripe:
   * людина бачить результат одразу, а зараховує все одно лише підтверджений Stripe статус.
   */
  async getFundDeposit(
    user: AuthenticatedUser,
    paymentIntentId: string,
  ): Promise<{ status: FundDepositStatus; amount: number }> {
    const family = await this.context.requireFamilyFor(user.id);
    let deposit = await this.deposits.findOne({
      where: { providerPaymentId: paymentIntentId, familyId: family.id },
    });
    if (!deposit) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    if (deposit.status === FundDepositStatus.PENDING && this.stripeClient) {
      const intent = await this.call(() => this.stripe.paymentIntents.retrieve(paymentIntentId));
      deposit = (await this.applyPaymentIntent(intent)) ?? deposit;
    }
    return { status: deposit.status, amount: deposit.amount };
  }

  /** PaymentIntent → стан запису поповнення (ідемпотентно; запис створюється з metadata, якщо його ще немає) */
  async applyPaymentIntent(
    intent: Stripe.PaymentIntent,
    failed = false,
  ): Promise<FundDeposit | null> {
    if (intent.metadata?.kind !== KIND_FUND_TOPUP) return null;
    const status = failed
      ? FundDepositStatus.FAILED
      : intent.status === 'succeeded'
        ? FundDepositStatus.SUCCEEDED
        : intent.status === 'canceled'
          ? FundDepositStatus.CANCELED
          : FundDepositStatus.PENDING;
    let deposit = await this.deposits.findOne({ where: { providerPaymentId: intent.id } });
    if (!deposit) {
      const familyId = intent.metadata.familyId;
      if (!familyId || !(await this.families.exists({ where: { id: familyId } }))) return null;
      deposit = this.deposits.create({
        familyId,
        amount: fromMinor(intent.amount),
        currency: intent.currency.toUpperCase() as FundDeposit['currency'],
        createdById: intent.metadata.userId ?? null,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: intent.id,
        auto: intent.metadata.auto === 'true',
        status,
      });
    }
    // кінцеві статуси (повернення, спір) не перезаписуються пізнішою подією про успіх
    const final = [FundDepositStatus.REFUNDED, FundDepositStatus.DISPUTED];
    if (!final.includes(deposit.status)) deposit.status = status;
    if (status === FundDepositStatus.SUCCEEDED) {
      deposit.amount = fromMinor(intent.amount_received || intent.amount);
      deposit.method = deposit.method ?? (await this.methodOf(intent));
      deposit.failureReason = null;
    }
    if (failed) deposit.failureReason = intent.last_payment_error?.message ?? 'payment_failed';
    return this.deposits.save(deposit);
  }

  /** Спосіб оплати для показу: blik / paypal / apple_pay / google_pay / card */
  private async methodOf(intent: Stripe.PaymentIntent): Promise<string | null> {
    const pm = intent.payment_method;
    try {
      const method =
        typeof pm === 'string' ? await this.stripe.paymentMethods.retrieve(pm) : (pm ?? null);
      if (!method) return intent.payment_method_types[0] ?? null;
      return method.type === 'card' && method.card?.wallet?.type
        ? method.card.wallet.type
        : method.type;
    } catch {
      return intent.payment_method_types[0] ?? null;
    }
  }

  // ═════════════════════════ вебхуки Stripe ═════════════════════════

  /**
   * Вебхук Stripe: підпис перевіряється (STRIPE_WEBHOOK_SECRET; для подій Connect — STRIPE_CONNECT_WEBHOOK_SECRET).
   * Повторна доставка тієї ж події нічого не змінює (payment_webhook_events + ідемпотентні оновлення).
   */
  async handleStripeWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    const stripe = this.stripe;
    if (!rawBody || !signature)
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'missing signature',
      );
    const secrets = [
      this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true }),
      this.config.get('STRIPE_CONNECT_WEBHOOK_SECRET', { infer: true }),
    ].filter((s): s is string => !!s);
    let event: Stripe.Event | null = null;
    for (const secret of secrets) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        break;
      } catch {
        // наступний секрет
      }
    }
    if (!event) {
      this.logger.warn({ event: 'stripe_webhook_bad_signature' });
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.BAD_REQUEST, 'bad signature');
    }
    if (await this.webhookEvents.exists({ where: { id: event.id } })) return;

    await this.processEvent(event);
    await this.webhookEvents
      .createQueryBuilder()
      .insert()
      .values({ id: event.id, provider: 'stripe', type: event.type })
      .orIgnore()
      .execute();
  }

  async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.processing':
      case 'payment_intent.canceled':
        await this.applyPaymentIntent(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.applyPaymentIntent(event.data.object, true);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        // повне повернення — гроші пішли з фонду; часткове — лише в лог (рішення приймає людина в Dashboard)
        if (intentId && charge.refunded) {
          await this.deposits.update(
            { providerPaymentId: intentId },
            { status: FundDepositStatus.REFUNDED },
          );
        } else {
          this.logger.warn({
            event: 'stripe_partial_refund',
            charge: charge.id,
            refunded: charge.amount_refunded,
          });
        }
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        const intentId =
          typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : dispute.payment_intent?.id;
        if (intentId)
          await this.deposits.update(
            { providerPaymentId: intentId },
            { status: FundDepositStatus.DISPUTED },
          );
        this.logger.warn({ event: 'stripe_dispute', dispute: dispute.id, intent: intentId });
        break;
      }
      case 'setup_intent.succeeded':
        await this.saveDefaultPaymentMethod(event.data.object);
        break;
      case 'account.updated':
        await this.syncConnectAccount(event.data.object);
        break;
      case 'transfer.reversed':
        await this.markTransferReversed(event.data.object);
        break;
      default:
        break;
    }
  }

  // ═════════════════════════ автопоповнення ═════════════════════════

  /** SetupIntent для збереження картки (PaymentSheet у режимі setup). BLIK для автосписань не підходить. */
  async createSetupIntent(user: AuthenticatedUser): Promise<SetupIntentResponseDto> {
    const stripe = this.stripe;
    await this.context.requireFamilyFor(user.id);
    const account = await this.ensureCustomer(user.id);
    const customerId = account.stripeCustomerId as string;
    const intent = await this.call(() =>
      stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        allowed_payment_method_types: ['card'],
        metadata: { userId: user.id },
      }),
    );
    const ephemeralKey = await this.call(() =>
      stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: STRIPE_API_VERSION }),
    );
    return {
      setupIntentId: intent.id,
      clientSecret: intent.client_secret as string,
      customerId,
      ephemeralKey: ephemeralKey.secret as string,
    };
  }

  private async saveDefaultPaymentMethod(intent: Stripe.SetupIntent): Promise<void> {
    const customerId = typeof intent.customer === 'string' ? intent.customer : intent.customer?.id;
    const pmId =
      typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id;
    if (!customerId || !pmId) return;
    const account = await this.accounts.findOne({ where: { stripeCustomerId: customerId } });
    if (!account) return;
    let brand: string | null = null;
    let last4: string | null = null;
    try {
      const pm = await this.stripe.paymentMethods.retrieve(pmId);
      brand = pm.card?.brand ?? null;
      last4 = pm.card?.last4 ?? null;
    } catch {
      // показ картки — не критично
    }
    await this.accounts.update(account.id, {
      defaultPaymentMethodId: pmId,
      cardBrand: brand,
      cardLast4: last4,
    });
  }

  async getAutoTopup(user: AuthenticatedUser): Promise<AutoTopupResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    const [topup, account] = await Promise.all([
      this.topups.findOne({ where: { familyId: family.id } }),
      this.accounts.findOne({ where: { userId: user.id } }),
    ]);
    return this.toAutoTopupResponse(topup, account, family);
  }

  async saveAutoTopup(user: AuthenticatedUser, dto: AutoTopupDto): Promise<AutoTopupResponseDto> {
    if (!this.enabled)
      throw new AppException(ErrorCode.PAYMENTS_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    const family = await this.context.requireFamilyFor(user.id);
    const account = await this.accounts.findOne({ where: { userId: user.id } });
    if (dto.active && !account?.defaultPaymentMethodId)
      throw new AppException(ErrorCode.PAYMENT_METHOD_REQUIRED, HttpStatus.UNPROCESSABLE_ENTITY);
    let topup = await this.topups.findOne({ where: { familyId: family.id } });
    const now = Date.now();
    if (!topup) {
      topup = this.topups.create({
        familyId: family.id,
        createdById: user.id,
        nextRunAt: new Date(now),
      });
    }
    const intervalChanged = topup.interval !== dto.interval;
    topup.amount = roundMoney(dto.amount);
    topup.interval = dto.interval;
    topup.createdById = user.id;
    if (dto.active && (!topup.active || intervalChanged || !topup.id)) {
      // перше списання — одразу при наступному запуску cron, далі — за інтервалом
      topup.nextRunAt = new Date(now);
      topup.failures = 0;
      topup.lastError = null;
    }
    topup.active = dto.active;
    const saved = await this.topups.save(topup);
    return this.toAutoTopupResponse(saved, account, family);
  }

  /** Cron: списати всі автопоповнення, яким настав час (кожне — окремо, помилка одного не зупиняє інших) */
  async runDueAutoTopups(now: Date = new Date()): Promise<{ charged: number; failed: number }> {
    if (!this.stripeClient) return { charged: 0, failed: 0 };
    const due = await this.topups.find({
      where: { active: true, nextRunAt: LessThanOrEqual(now) },
      take: 200,
    });
    let charged = 0;
    let failed = 0;
    for (const topup of due) {
      try {
        await this.chargeAutoTopup(topup, now);
        charged += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        topup.failures += 1;
        topup.lastError = message.slice(0, 500);
        topup.nextRunAt = new Date(now.getTime() + AUTO_TOPUP_RETRY_MS);
        if (topup.failures >= AUTO_TOPUP_MAX_FAILURES) topup.active = false;
        await this.topups.save(topup);
        this.logger.warn({
          event: 'auto_topup_failed',
          familyId: topup.familyId,
          failures: topup.failures,
          reason: message,
        });
      }
    }
    if (due.length > 0)
      this.logger.log({ event: 'auto_topups_run', due: due.length, charged, failed });
    return { charged, failed };
  }

  private async chargeAutoTopup(topup: AutoTopup, now: Date): Promise<void> {
    const [family, account] = await Promise.all([
      this.families.findOne({ where: { id: topup.familyId } }),
      this.accounts.findOne({ where: { userId: topup.createdById } }),
    ]);
    if (!family || !account?.stripeCustomerId || !account.defaultPaymentMethodId)
      throw new Error('payment method missing');
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: toMinor(topup.amount),
        currency: family.currency.toLowerCase(),
        customer: account.stripeCustomerId,
        payment_method: account.defaultPaymentMethodId,
        off_session: true,
        confirm: true,
        description: `Auto top-up ${family.id}`,
        metadata: {
          kind: KIND_FUND_TOPUP,
          familyId: family.id,
          userId: topup.createdById,
          auto: 'true',
        },
      },
      // той самий запуск не спише двічі навіть після рестарту сервера
      { idempotencyKey: `auto-topup:${topup.id}:${topup.nextRunAt.toISOString()}` },
    );
    await this.applyPaymentIntent(intent);
    topup.failures = 0;
    topup.lastError = null;
    topup.nextRunAt = nextRun(topup.nextRunAt > now ? topup.nextRunAt : now, topup.interval);
    await this.topups.save(topup);
  }

  private toAutoTopupResponse(
    topup: AutoTopup | null,
    account: PaymentAccount | null,
    family: Family,
  ): AutoTopupResponseDto {
    return {
      active: topup?.active ?? false,
      amount: topup?.amount ?? null,
      interval: topup?.interval ?? null,
      nextRunAt: topup?.active ? topup.nextRunAt : null,
      lastError: topup?.lastError ?? null,
      currency: family.currency,
      card: account?.cardLast4 ? { brand: account.cardBrand, last4: account.cardLast4 } : null,
    };
  }

  // ═════════════════════════ виплати батькові (Connect) ═════════════════════════

  /** Посилання на налаштування виплат у Stripe (особа, рахунок/картка). Акаунт створюється при першому запиті. */
  async createPayoutOnboarding(
    user: AuthenticatedUser,
    country?: string,
  ): Promise<PayoutLinkResponseDto> {
    const stripe = this.stripe;
    await this.context.requireFamilyFor(user.id);
    const account = await this.ensureConnectAccount(user.id, country);
    const base = this.config.get('PUBLIC_BASE_URL', { infer: true }).replace(/\/$/, '');
    const prefix = this.config.get('API_GLOBAL_PREFIX', { infer: true });
    const link = await this.call(() =>
      stripe.accountLinks.create({
        account: account.stripeAccountId as string,
        type: 'account_onboarding',
        refresh_url: `${base}/${prefix}/payments/payouts/return?state=refresh`,
        return_url: `${base}/${prefix}/payments/payouts/return?state=done`,
      }),
    );
    return { url: link.url };
  }

  /** Кабінет Stripe Express: змінити рахунок/картку для виплат, побачити історію */
  async createPayoutDashboardLink(user: AuthenticatedUser): Promise<PayoutLinkResponseDto> {
    const stripe = this.stripe;
    const account = await this.accounts.findOne({ where: { userId: user.id } });
    if (!account?.stripeAccountId)
      throw new AppException(ErrorCode.PAYOUTS_NOT_READY, HttpStatus.CONFLICT);
    const link = await this.call(() =>
      stripe.accounts.createLoginLink(account.stripeAccountId as string),
    );
    return { url: link.url };
  }

  async getPayoutStatus(user: AuthenticatedUser): Promise<PayoutStatusResponseDto> {
    const family = await this.context.requireFamilyFor(user.id);
    let account = await this.accounts.findOne({ where: { userId: user.id } });
    // одразу після повернення з онбордингу вебхук міг ще не дійти — уточнюємо в Stripe
    if (account?.stripeAccountId && !account.payoutsEnabled && this.stripeClient) {
      const remote = await this.call(() =>
        this.stripe.accounts.retrieve(account?.stripeAccountId as string),
      );
      account = (await this.syncConnectAccount(remote)) ?? account;
    }
    const { owed, pendingTotal } = await this.balance.getBalance(family.id);
    const held = await this.balance.getHeldFunds(family.id);
    const available =
      Math.max(0, Math.min(toCents(owed) - toCents(pendingTotal), toCents(held))) / 100;
    return {
      enabled: this.enabled,
      connected: !!account?.stripeAccountId,
      detailsSubmitted: account?.detailsSubmitted ?? false,
      payoutsEnabled: account?.payoutsEnabled ?? false,
      available,
      heldFunds: held,
      currency: family.currency,
    };
  }

  /**
   * Виплата батькові: переказ (settlement, method = stripe) резервується в транзакції під блокуванням сім'ї
   * (паралельні виплати не перевищать доступне), потім Stripe Transfer на Connect-акаунт з ключем ідемпотентності
   * = id переказу. Успіх → `confirmed` (гроші на балансі батька в Stripe, далі Stripe сам виплачує на рахунок);
   * відмова Stripe → `rejected`, сума знову доступна.
   */
  async withdraw(user: AuthenticatedUser, amount: number): Promise<WithdrawResponseDto> {
    const stripe = this.stripe;
    const family = await this.context.requireFamilyFor(user.id);
    const account = await this.accounts.findOne({ where: { userId: user.id } });
    if (!account?.stripeAccountId || !account.payoutsEnabled)
      throw new AppException(ErrorCode.PAYOUTS_NOT_READY, HttpStatus.CONFLICT);
    const value = roundMoney(amount);

    const entry = await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Family)
        .createQueryBuilder('f')
        .setLock('pessimistic_write')
        .select('f.id')
        .where('f.id = :id', { id: family.id })
        .getOneOrFail();
      const { owed, pendingTotal } = await this.balance.getBalance(family.id, manager);
      const held = await this.balance.getHeldFunds(family.id, manager);
      const available = Math.min(toCents(owed) - toCents(pendingTotal), toCents(held));
      if (toCents(value) <= 0 || toCents(value) > available)
        throw new AppException(
          ErrorCode.PAYOUT_EXCEEDS_AVAILABLE,
          HttpStatus.UNPROCESSABLE_ENTITY,
          `max ${Math.max(0, available) / 100}`,
        );
      const repo = manager.getRepository(LedgerEntry);
      return repo.save(
        repo.create({
          familyId: family.id,
          type: LedgerType.SETTLEMENT,
          amount: value,
          currency: family.currency,
          status: LedgerStatus.PENDING,
          method: SettlementMethod.STRIPE,
          createdById: user.id,
        }),
      );
    });

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: toMinor(value),
          currency: family.currency.toLowerCase(),
          destination: account.stripeAccountId,
          description: `Reward payout ${family.id}`,
          metadata: { familyId: family.id, ledgerId: entry.id },
        },
        { idempotencyKey: `payout:${entry.id}` },
      );
      await this.ledger.update(entry.id, {
        status: LedgerStatus.CONFIRMED,
        resolvedAt: new Date(),
        providerTransferId: transfer.id,
      });
      this.emitResolved(family, entry, LedgerStatus.CONFIRMED);
      this.logger.log({
        event: 'payout_transferred',
        familyId: family.id,
        ledgerId: entry.id,
        transfer: transfer.id,
        amount: value,
      });
      return {
        ledgerId: entry.id,
        amount: value,
        currency: family.currency,
        status: LedgerStatus.CONFIRMED,
      };
    } catch (error) {
      await this.ledger.update(entry.id, { status: LedgerStatus.REJECTED, resolvedAt: new Date() });
      this.logger.error({
        event: 'payout_failed',
        familyId: family.id,
        ledgerId: entry.id,
        reason: String(error),
      });
      throw new AppException(ErrorCode.PAYMENT_FAILED, HttpStatus.BAD_GATEWAY);
    }
  }

  private async markTransferReversed(transfer: Stripe.Transfer): Promise<void> {
    const entry = await this.ledger.findOne({ where: { providerTransferId: transfer.id } });
    if (!entry || entry.status === LedgerStatus.REJECTED) return;
    if (transfer.amount_reversed < transfer.amount) {
      this.logger.warn({ event: 'stripe_partial_transfer_reversal', transfer: transfer.id });
      return;
    }
    await this.ledger.update(entry.id, { status: LedgerStatus.REJECTED });
    this.logger.warn({ event: 'payout_reversed', ledgerId: entry.id, transfer: transfer.id });
  }

  private async syncConnectAccount(remote: Stripe.Account): Promise<PaymentAccount | null> {
    const account = await this.accounts.findOne({ where: { stripeAccountId: remote.id } });
    if (!account) return null;
    account.payoutsEnabled = !!remote.payouts_enabled;
    account.detailsSubmitted = !!remote.details_submitted;
    return this.accounts.save(account);
  }

  private emitResolved(
    family: Family,
    entry: LedgerEntry,
    status: LedgerStatus.CONFIRMED | LedgerStatus.REJECTED,
  ): void {
    const payload: SettlementResolvedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
      ledgerId: entry.id,
      amount: entry.amount,
      currency: entry.currency,
      status,
    };
    this.events.emit(DomainEvent.SETTLEMENT_RESOLVED, payload);
  }

  // ═════════════════════════ акаунти Stripe ═════════════════════════

  private async accountFor(userId: string): Promise<PaymentAccount> {
    const existing = await this.accounts.findOne({ where: { userId } });
    if (existing) return existing;
    await this.accounts.createQueryBuilder().insert().values({ userId }).orIgnore().execute();
    return this.accounts.findOneOrFail({ where: { userId } });
  }

  private async ensureCustomer(userId: string): Promise<PaymentAccount> {
    const account = await this.accountFor(userId);
    if (account.stripeCustomerId) return account;
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const customer = await this.call(() =>
      this.stripe.customers.create(
        {
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
          name: user.name ?? undefined,
          metadata: { userId },
        },
        { idempotencyKey: `customer:${userId}` },
      ),
    );
    account.stripeCustomerId = customer.id;
    return this.accounts.save(account);
  }

  private async ensureConnectAccount(userId: string, country?: string): Promise<PaymentAccount> {
    const account = await this.accountFor(userId);
    if (account.stripeAccountId) return account;
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const resolvedCountry = (
      country ??
      (user.phone ? parsePhoneNumberFromString(user.phone)?.country : undefined) ??
      this.config.get('STRIPE_CONNECT_DEFAULT_COUNTRY', { infer: true })
    ).toUpperCase();
    const remote = await this.call(() =>
      this.stripe.accounts.create(
        {
          type: 'express',
          country: resolvedCountry,
          email: user.email ?? undefined,
          business_type: 'individual',
          capabilities: { transfers: { requested: true } },
          business_profile: { product_description: 'Family exercise rewards' },
          metadata: { userId },
        },
        { idempotencyKey: `connect:${userId}` },
      ),
    );
    account.stripeAccountId = remote.id;
    account.payoutsEnabled = !!remote.payouts_enabled;
    account.detailsSubmitted = !!remote.details_submitted;
    return this.accounts.save(account);
  }

  /** Виклик Stripe: помилку (картку відхилено, невірний ключ…) пишемо в лог, клієнту — PAYMENT_FAILED */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const e = error as { type?: string; code?: string; message?: string; statusCode?: number };
      this.logger.error({
        event: 'stripe_error',
        type: e.type,
        code: e.code,
        status: e.statusCode,
        message: e.message,
      });
      throw new AppException(ErrorCode.PAYMENT_FAILED, HttpStatus.BAD_GATEWAY);
    }
  }
}

/** Наступна дата автосписання: +7 днів або +1 календарний місяць */
export function nextRun(from: Date, interval: TopupInterval): Date {
  const next = new Date(from.getTime());
  if (interval === TopupInterval.WEEK) next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}
