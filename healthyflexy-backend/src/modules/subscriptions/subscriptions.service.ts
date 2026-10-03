import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { SubscriptionPlatform, SubscriptionStatus } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../common/interfaces';
import { EnvironmentVariables } from '../../config';
import { User } from '../users/entities/user.entity';
import { SubscriptionResponseDto } from './dto';
import { Subscription } from './entities/subscription.entity';
import { GooglePlayClient, PlaySubscriptionV2 } from './google-play.client';

export const APPLE_VERIFIER = Symbol('APPLE_VERIFIER');

/** Статуси, що дають доступ (canceled — до кінця оплаченого періоду) */
const ENTITLED: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.GRACE,
  SubscriptionStatus.CANCELED,
];

const PLAY_STATE: Record<string, SubscriptionStatus> = {
  SUBSCRIPTION_STATE_ACTIVE: SubscriptionStatus.ACTIVE,
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: SubscriptionStatus.GRACE,
  SUBSCRIPTION_STATE_ON_HOLD: SubscriptionStatus.ON_HOLD,
  SUBSCRIPTION_STATE_PAUSED: SubscriptionStatus.PAUSED,
  SUBSCRIPTION_STATE_CANCELED: SubscriptionStatus.CANCELED,
  SUBSCRIPTION_STATE_EXPIRED: SubscriptionStatus.EXPIRED,
  SUBSCRIPTION_STATE_PENDING: SubscriptionStatus.PENDING,
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: SubscriptionStatus.EXPIRED,
};

/**
 * Підписка через App Store / Google Play — лише перевірка на СЕРВЕРІ (клієнту не віримо):
 *  • App Store: StoreKit 2 підписана транзакція (JWS) → SignedDataVerifier; App Store Server Notifications V2
 *    оновлюють статус (продовження, невдале списання → пільговий період, повернення, відкликання).
 *    `appAccountToken` покупки = id користувача (застосунок передає його в purchase) — чужу покупку не прив'язати.
 *  • Google Play: purchaseToken → purchases.subscriptionsv2.get; підтвердження (acknowledge); RTDN через Pub/Sub.
 *    `obfuscatedExternalAccountId` = id користувача (BillingFlowParams.setObfuscatedAccountId).
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject(APPLE_VERIFIER) private readonly apple: SignedDataVerifier | null,
    private readonly play: GooglePlayClient,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getMine(userId: string): Promise<SubscriptionResponseDto> {
    const rows = await this.subscriptions.find({ where: { userId }, order: { expiresAt: 'DESC' } });
    const now = Date.now();
    const current = rows.find(
      (s) => ENTITLED.includes(s.status) && (!s.expiresAt || s.expiresAt.getTime() > now),
    );
    return {
      active: !!current,
      platform: current?.platform ?? null,
      productId: current?.productId ?? null,
      status: current?.status ?? rows[0]?.status ?? null,
      expiresAt: current?.expiresAt ?? null,
      autoRenew: current?.autoRenew ?? false,
    };
  }

  // ───────────── App Store ─────────────

  async verifyApple(
    user: AuthenticatedUser,
    signedTransaction: string,
  ): Promise<SubscriptionResponseDto> {
    const verifier = this.appleVerifier();
    const tx = await verifier
      .verifyAndDecodeTransaction(signedTransaction)
      .catch((error: unknown) => {
        this.logger.warn({ event: 'apple_tx_invalid', reason: String(error) });
        throw new AppException(ErrorCode.IAP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
      });
    if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== user.id.toLowerCase())
      throw new AppException(
        ErrorCode.IAP_INVALID,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'foreign purchase',
      );
    await this.upsertApple(user.id, tx, undefined);
    return this.getMine(user.id);
  }

  /** App Store Server Notifications V2: підпис перевіряється бібліотекою Apple; невідома покупка — ігнор */
  async appleNotification(signedPayload: string): Promise<void> {
    const verifier = this.appleVerifier();
    const note = await verifier
      .verifyAndDecodeNotification(signedPayload)
      .catch((error: unknown) => {
        this.logger.warn({ event: 'apple_notification_invalid', reason: String(error) });
        throw new AppException(ErrorCode.IAP_INVALID, HttpStatus.BAD_REQUEST);
      });
    const signedTx = note.data?.signedTransactionInfo;
    if (!signedTx) return;
    const tx = await verifier.verifyAndDecodeTransaction(signedTx);
    const renewal = note.data?.signedRenewalInfo
      ? await verifier.verifyAndDecodeRenewalInfo(note.data.signedRenewalInfo)
      : undefined;
    const existing = tx.originalTransactionId
      ? await this.subscriptions.findOne({
          where: { platform: SubscriptionPlatform.IOS, externalId: tx.originalTransactionId },
        })
      : null;
    const userId = existing?.userId ?? (await this.userIdFromToken(tx.appAccountToken));
    if (!userId) {
      this.logger.warn({ event: 'apple_notification_unknown_user', type: note.notificationType });
      return;
    }
    const forced =
      note.notificationType === 'DID_FAIL_TO_RENEW' && note.subtype === 'GRACE_PERIOD'
        ? SubscriptionStatus.GRACE
        : note.notificationType === 'REFUND' || note.notificationType === 'REVOKE'
          ? SubscriptionStatus.REVOKED
          : note.notificationType === 'EXPIRED' || note.notificationType === 'GRACE_PERIOD_EXPIRED'
            ? SubscriptionStatus.EXPIRED
            : undefined;
    await this.upsertApple(userId, tx, renewal, forced);
    this.logger.log({
      event: 'apple_notification',
      type: note.notificationType,
      subtype: note.subtype,
    });
  }

  private async upsertApple(
    userId: string,
    tx: JWSTransactionDecodedPayload,
    renewal: JWSRenewalInfoDecodedPayload | undefined,
    forced?: SubscriptionStatus,
  ): Promise<void> {
    if (!tx.originalTransactionId || !tx.productId)
      throw new AppException(ErrorCode.IAP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    const expiresAt = tx.expiresDate ? new Date(tx.expiresDate) : null;
    const autoRenew = renewal ? renewal.autoRenewStatus === 1 : true;
    const status =
      forced ??
      (tx.revocationDate
        ? SubscriptionStatus.REVOKED
        : expiresAt && expiresAt.getTime() <= Date.now()
          ? SubscriptionStatus.EXPIRED
          : autoRenew
            ? SubscriptionStatus.ACTIVE
            : SubscriptionStatus.CANCELED);
    await this.save({
      userId,
      platform: SubscriptionPlatform.IOS,
      externalId: tx.originalTransactionId,
      productId: tx.productId,
      status,
      expiresAt,
      autoRenew,
      environment: tx.environment ? String(tx.environment) : null,
      raw: { transaction: tx, renewal },
    });
  }

  // ───────────── Google Play ─────────────

  async verifyGoogle(
    user: AuthenticatedUser,
    productId: string,
    purchaseToken: string,
  ): Promise<SubscriptionResponseDto> {
    if (!this.play.enabled)
      throw new AppException(ErrorCode.IAP_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    const sub = await this.play.getSubscription(purchaseToken).catch(() => {
      throw new AppException(ErrorCode.IAP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    });
    const owner = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (owner && owner !== user.id)
      throw new AppException(
        ErrorCode.IAP_INVALID,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'foreign purchase',
      );
    const item = sub.lineItems?.find((l) => l.productId === productId) ?? sub.lineItems?.[0];
    if (!item?.productId)
      throw new AppException(ErrorCode.IAP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    await this.upsertGoogle(user.id, purchaseToken, sub);
    return this.getMine(user.id);
  }

  /**
   * Real-time developer notifications (Pub/Sub push). Захист — секрет у URL (`?token=GOOGLE_RTDN_TOKEN`).
   * Повідомлення лише каже «щось змінилось» — актуальний стан завжди перечитується через API.
   */
  async googleRtdn(
    body: { message?: { data?: string } },
    token: string | undefined,
  ): Promise<void> {
    const expected = this.config.get('GOOGLE_RTDN_TOKEN', { infer: true });
    if (!expected || token !== expected)
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    if (!this.play.enabled || !body.message?.data) return;
    const payload = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf8')) as {
      packageName?: string;
      subscriptionNotification?: { purchaseToken?: string; notificationType?: number };
      testNotification?: unknown;
    };
    const purchaseToken = payload.subscriptionNotification?.purchaseToken;
    if (payload.testNotification || !purchaseToken || payload.packageName !== this.play.packageName)
      return;
    const sub = await this.play.getSubscription(purchaseToken);
    const existing = await this.subscriptions.findOne({
      where: { platform: SubscriptionPlatform.ANDROID, externalId: purchaseToken },
    });
    const userId =
      existing?.userId ??
      (await this.userIdFromToken(sub.externalAccountIdentifiers?.obfuscatedExternalAccountId));
    if (!userId) {
      this.logger.warn({ event: 'google_rtdn_unknown_user' });
      return;
    }
    await this.upsertGoogle(userId, purchaseToken, sub);
    this.logger.log({
      event: 'google_rtdn',
      type: payload.subscriptionNotification?.notificationType,
    });
  }

  private async upsertGoogle(
    userId: string,
    purchaseToken: string,
    sub: PlaySubscriptionV2,
  ): Promise<void> {
    const item = sub.lineItems?.[0];
    const status = PLAY_STATE[sub.subscriptionState ?? ''] ?? SubscriptionStatus.PENDING;
    await this.save({
      userId,
      platform: SubscriptionPlatform.ANDROID,
      externalId: purchaseToken,
      productId: item?.productId ?? 'unknown',
      status,
      expiresAt: item?.expiryTime ? new Date(item.expiryTime) : null,
      autoRenew: item?.autoRenewingPlan?.autoRenewEnabled ?? false,
      environment: sub.testPurchase ? 'Test' : 'Production',
      raw: sub as unknown as Record<string, unknown>,
    });
    // апгрейд/зміна плану: старий токен більше не діє
    if (sub.linkedPurchaseToken)
      await this.subscriptions.update(
        { platform: SubscriptionPlatform.ANDROID, externalId: sub.linkedPurchaseToken },
        { status: SubscriptionStatus.EXPIRED },
      );
    // без acknowledge за 3 дні Google повертає гроші й скасовує підписку
    if (
      sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' &&
      item?.productId &&
      (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.GRACE)
    ) {
      await this.play.acknowledge(item.productId, purchaseToken).catch((error: unknown) => {
        this.logger.error({ event: 'google_ack_failed', reason: String(error) });
      });
    }
  }

  // ───────────── спільне ─────────────

  private appleVerifier(): SignedDataVerifier {
    if (!this.apple) throw new AppException(ErrorCode.IAP_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    return this.apple;
  }

  private async userIdFromToken(token: string | undefined): Promise<string | null> {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
    return (await this.users.exists({ where: { id: token } })) ? token : null;
  }

  private async save(
    data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'user'>,
  ): Promise<void> {
    const existing = await this.subscriptions.findOne({
      where: { platform: data.platform, externalId: data.externalId },
    });
    await this.subscriptions.save(this.subscriptions.create({ ...existing, ...data }));
  }
}
