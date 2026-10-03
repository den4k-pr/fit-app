import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { Currency, LedgerStatus, LedgerType, SettlementMethod } from '../../../common/enums';
import { AppBaseEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { DaySession } from '../../workouts/entities/day-session.entity';
import { ExerciseRecord } from '../../workouts/entities/exercise-record.entity';

/**
 * Облік грошей — ЄДИНЕ джерело правди для балансу (розділ 8.5). Реальні гроші тут не рухаються.
 *
 *   owed    = SUM(earn) − SUM(settlement WHERE status = 'confirmed')
 *   pending = SUM(settlement WHERE status = 'pending')
 *
 * • earn: створюється сервером за КОЖНУ зараховану вправу (частка денної ставки); завжди confirmed;
 *   рівно один на виконану вправу (часткове унікальне обмеження робить нарахування ідемпотентним).
 *   Старі записи (до переходу) — один на день, без exercise_record_id.
 * • settlement: дитина створює pending («Переказ зроблено»); батько/мати → confirmed | rejected.
 * Записи не редагуються й не видаляються (окрім каскаду при видаленні сім'ї).
 */
@Entity({ name: 'ledger_entries' })
@Index('IDX_ledger_entries_session', ['sessionId'])
@Index('IDX_ledger_entries_created_by', ['createdById'])
@Index('IDX_ledger_entries_family_created', ['familyId', 'createdAt'])
@Index('IDX_ledger_entries_family_type_status', ['familyId', 'type', 'status'])
@Index('UQ_ledger_entries_provider_transfer', ['providerTransferId'], {
  unique: true,
  where: `"provider_transfer_id" IS NOT NULL`,
})
@Index('UQ_ledger_entries_one_earn_per_record', ['exerciseRecordId'], {
  unique: true,
  where: `"type" = 'earn' AND "exercise_record_id" IS NOT NULL`,
})
@Check('CHK_ledger_entries_amount', `"amount" > 0`)
@Check(
  'CHK_ledger_entries_earn_shape',
  `"type" = 'settlement' OR ("session_id" IS NOT NULL AND "status" = 'confirmed')`,
)
@Check(
  'CHK_ledger_entries_resolved_at',
  `"type" = 'earn' OR ("status" = 'pending' AND "resolved_at" IS NULL) OR ("status" IN ('confirmed','rejected') AND "resolved_at" IS NOT NULL)`,
)
export class LedgerEntry extends AppBaseEntity {
  @ManyToOne(() => Family, (family) => family.ledger, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'family_id' })
  family: Relation<Family>;

  @Column({ type: 'uuid', name: 'family_id' })
  familyId: string;

  @Column({ type: 'enum', enum: LedgerType, enumName: 'ledger_type' })
  type: LedgerType;

  /** Завжди > 0. Знак визначається типом запису. */
  @Column({ type: 'numeric', precision: 8, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'enum', enum: Currency, enumName: 'currency_code' })
  currency: Currency;

  @Column({ type: 'enum', enum: LedgerStatus, enumName: 'ledger_status' })
  status: LedgerStatus;

  /** Лише для earn: за який день нараховано */
  @ManyToOne(() => DaySession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: Relation<DaySession> | null;

  @Column({ type: 'uuid', name: 'session_id', nullable: true })
  sessionId: string | null;

  /** Для earn: за яку вправу нараховано */
  @ManyToOne(() => ExerciseRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'exercise_record_id' })
  exerciseRecord: Relation<ExerciseRecord> | null;

  @Column({ type: 'uuid', name: 'exercise_record_id', nullable: true })
  exerciseRecordId: string | null;

  /** Для settlement: дитина, що створила переказ. Для earn: null (створює система). */
  // CASCADE (а не SET NULL): видалення користувача каскадно знищує сім'ю та її журнал; SET NULL у тому ж
  // DELETE давав би «завислі» версії рядків і порушення FK (перевірено на реальній БД)
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  /** Коли батько/мати підтвердив або відхилив переказ */
  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  /** Settlement: `manual` — переказ поза застосунком (підтверджує батько/мати); `stripe` — виплата через Stripe Connect */
  @Column({ type: 'varchar', length: 20, default: SettlementMethod.MANUAL })
  method: SettlementMethod;

  /** Stripe Transfer id (`tr_…`) для виплати через Connect */
  @Column({ type: 'varchar', length: 255, name: 'provider_transfer_id', nullable: true })
  providerTransferId: string | null;
}
