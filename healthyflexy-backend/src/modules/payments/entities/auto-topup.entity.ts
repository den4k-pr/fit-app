import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { TopupInterval } from '../../../common/enums';
import { UpdatableEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';

/** Автопоповнення фонду (макет: «Настроить автоплатеж» — щотижня / щомісяця) збереженою карткою спонсора */
@Entity({ name: 'auto_topups' })
@Index('IDX_auto_topups_due', ['nextRunAt'], { where: '"active"' })
@Index('IDX_auto_topups_created_by', ['createdById'])
@Check('CHK_auto_topups_amount', `"amount" > 0`)
@Check('CHK_auto_topups_interval', `"interval" IN ('week','month')`)
export class AutoTopup extends UpdatableEntity {
  @OneToOne(() => Family, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'family_id' })
  family: Relation<Family>;

  @Column({ type: 'uuid', name: 'family_id', unique: true })
  familyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  interval: TopupInterval;

  @Column({ type: 'timestamptz', name: 'next_run_at' })
  nextRunAt: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** Невдалих списань поспіль; після AUTO_TOPUP_MAX_FAILURES — автопоповнення вимикається */
  @Column({ type: 'smallint', default: 0 })
  failures: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;
}
