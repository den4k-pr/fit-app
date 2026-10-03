import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Currency, FundDepositStatus, PaymentProvider } from '../../../common/enums';
import { AppBaseEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';

/**
 * «Фонд»: спонсор (дитина) наперед закладає суму на винагороди — хоч на місяць, хоч на роки вперед.
 * Лише облік (реальні гроші тут не рухаються), записи не редагуються й не видаляються.
 *
 *   залишок фонду = SUM(поповнень) − SUM(нарахувань earn з моменту першого поповнення)
 *
 * На скільки вистачить — залишок ÷ (ставка × днів занять на тиждень), див. StatsService.
 *
 * Два види: облікове поповнення (`manual`, гроші поза застосунком, одразу `succeeded`) і реальна оплата через
 * Stripe (`stripe`: `pending` → `succeeded` лише за вебхуком/перевіркою PaymentIntent; повернення → `refunded`).
 * У залишок фонду входять лише `succeeded`.
 */
@Entity({ name: 'fund_deposits' })
@Index('IDX_fund_deposits_family_created', ['familyId', 'createdAt'])
@Index('IDX_fund_deposits_created_by', ['createdById'])
@Check('CHK_fund_deposits_amount', `"amount" > 0`)
@Check(
  'CHK_fund_deposits_status',
  `"status" IN ('pending','succeeded','failed','canceled','refunded','disputed')`,
)
@Index('UQ_fund_deposits_provider_payment', ['providerPaymentId'], {
  unique: true,
  where: `"provider_payment_id" IS NOT NULL`,
})
export class FundDeposit extends AppBaseEntity {
  @ManyToOne(() => Family, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'family_id' })
  family: Relation<Family>;

  @Column({ type: 'uuid', name: 'family_id' })
  familyId: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'enum', enum: Currency, enumName: 'currency_code' })
  currency: Currency;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  @Column({ type: 'varchar', length: 20, default: PaymentProvider.MANUAL })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 20, default: FundDepositStatus.SUCCEEDED })
  status: FundDepositStatus;

  /** Stripe PaymentIntent id (`pi_…`) — унікальний: вебхук не зарахує оплату двічі */
  @Column({ type: 'varchar', length: 255, name: 'provider_payment_id', nullable: true })
  providerPaymentId: string | null;

  /** Спосіб оплати: card / blik / paypal / apple_pay / google_pay … */
  @Column({ type: 'varchar', length: 30, nullable: true })
  method: string | null;

  @Column({ type: 'text', name: 'failure_reason', nullable: true })
  failureReason: string | null;

  /** Створено автопоповненням (збережена картка, без участі людини) */
  @Column({ type: 'boolean', default: false })
  auto: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
