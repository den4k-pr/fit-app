import { Column, Entity, JoinColumn, OneToOne, Relation } from 'typeorm';
import { UpdatableEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Stripe-дані користувача. Спонсор — Customer (оплати, збережена картка для автопоповнення);
 * батько/мати — Connect Express акаунт (Stripe сам перевіряє особу й виплачує на рахунок/картку).
 * Номерів карток і рахунків тут НЕМАЄ — лише id у Stripe та останні 4 цифри для показу.
 */
@Entity({ name: 'payment_accounts' })
export class PaymentAccount extends UpdatableEntity {
  @OneToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'stripe_customer_id',
    nullable: true,
    unique: true,
  })
  stripeCustomerId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'stripe_account_id', nullable: true, unique: true })
  stripeAccountId: string | null;

  /** Stripe дозволив виплати (особу перевірено, рахунок додано) */
  @Column({ type: 'boolean', name: 'payouts_enabled', default: false })
  payoutsEnabled: boolean;

  @Column({ type: 'boolean', name: 'details_submitted', default: false })
  detailsSubmitted: boolean;

  /** Збережена картка для автопоповнення */
  @Column({ type: 'varchar', length: 255, name: 'default_payment_method_id', nullable: true })
  defaultPaymentMethodId: string | null;

  @Column({ type: 'varchar', length: 30, name: 'card_brand', nullable: true })
  cardBrand: string | null;

  @Column({ type: 'varchar', length: 4, name: 'card_last4', nullable: true })
  cardLast4: string | null;
}
