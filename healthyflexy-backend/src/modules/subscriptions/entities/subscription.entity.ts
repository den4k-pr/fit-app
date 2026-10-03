import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation, Unique } from 'typeorm';
import { SubscriptionPlatform, SubscriptionStatus } from '../../../common/enums';
import { UpdatableEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Підписка через App Store / Google Play (монетизація застосунку). НЕ стосується грошей сім'ї:
 * поповнення фонду й виплати — лише Stripe (правила магазинів: передача реальних грошей не через IAP).
 * `externalId`: App Store — originalTransactionId; Google Play — purchaseToken.
 */
@Entity({ name: 'subscriptions' })
@Unique('UQ_subscriptions_external', ['platform', 'externalId'])
@Index('IDX_subscriptions_user', ['userId'])
@Check('CHK_subscriptions_platform', `"platform" IN ('ios','android')`)
@Check(
  'CHK_subscriptions_status',
  `"status" IN ('active','grace','on_hold','paused','canceled','expired','revoked','pending')`,
)
export class Subscription extends UpdatableEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  platform: SubscriptionPlatform;

  @Column({ type: 'varchar', length: 200, name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 512, name: 'external_id' })
  externalId: string;

  @Column({ type: 'varchar', length: 20 })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', name: 'auto_renew', default: true })
  autoRenew: boolean;

  /** Sandbox / Production (App Store), або null */
  @Column({ type: 'varchar', length: 20, nullable: true })
  environment: string | null;

  /** Останній розшифрований payload магазину (для розбору спірних випадків) */
  @Column({ type: 'jsonb', nullable: true })
  raw: Record<string, unknown> | null;
}
