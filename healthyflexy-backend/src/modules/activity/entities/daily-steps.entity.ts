import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { UpdatableEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Кроки батька/матері за локальний день (графік «Кроки і тренування»). Телефон сам надсилає підсумки дня
 * (iOS — з історії CoreMotion за 7 днів, Android — поки застосунок відкритий); значення лише зростає.
 */
@Entity({ name: 'daily_steps' })
@Index('UQ_daily_steps_user_date', ['userId', 'date'], { unique: true })
@Check('CHK_daily_steps_range', `"steps" >= 0 AND "steps" <= 200000`)
export class DailySteps extends UpdatableEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /** Локальна дата YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int' })
  steps: number;
}
