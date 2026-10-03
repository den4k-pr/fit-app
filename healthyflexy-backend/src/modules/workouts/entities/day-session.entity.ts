import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { SessionStatus } from '../../../common/enums';
import { UpdatableEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { Family } from '../../families/entities/family.entity';
import { ExerciseRecord } from './exercise-record.entity';

/**
 * День занять сім'ї (розділ 8.1). Таблиця `sessions` з ТЗ перейменована на `day_sessions`,
 * щоб не плутати з сесіями авторизації.
 *
 * Створюється:
 *  • при першому відкритті «Сьогодні» (лише якщо день у plan_days) — `get_or_create_today`;
 *  • задачею `close-past-days` зі статусом `missed` для пропущених запланованих днів.
 * `date` — ЛОКАЛЬНА дата батька/матері (за profiles.timezone), не UTC.
 * `rate` фіксується на момент створення: зміна плану не переписує минуле й сьогодні.
 */
@Entity({ name: 'day_sessions' })
@Index('UQ_day_sessions_family_date', ['familyId', 'date'], { unique: true })
@Index('IDX_day_sessions_family_status_date', ['familyId', 'status', 'date'])
@Check(
  'CHK_day_sessions_done_range',
  `"exercises_done" >= 0 AND "exercises_done" <= "exercises_total"`,
)
@Check('CHK_day_sessions_earned', `"earned" >= 0`)
@Check(
  'CHK_day_sessions_completed_at',
  `"status" <> 'completed' OR ("completed_at" IS NOT NULL AND "exercises_done" = "exercises_total")`,
)
export class DaySession extends UpdatableEntity {
  @ManyToOne(() => Family, (family) => family.sessions, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'family_id' })
  family: Relation<Family>;

  @Column({ type: 'uuid', name: 'family_id' })
  familyId: string;

  /** Локальна дата YYYY-MM-DD (тип date; драйвер повертає рядок) */
  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    enumName: 'session_status',
    default: SessionStatus.PENDING,
  })
  status: SessionStatus;

  /** Знімок кількості активних вправ на момент створення дня */
  @Column({ type: 'int' })
  exercisesTotal: number;

  @Column({ type: 'int', default: 0 })
  exercisesDone: number;

  /**
   * Знімок складу дня (id вправ у порядку виконання) на момент створення: зміни плану, видів навантаження,
   * часу чи програми діють з наступного дня. null/порожньо — старі записи або день без програми (склад «живий»).
   */
  @Column({ type: 'uuid', array: true, name: 'exercise_ids', nullable: true })
  exerciseIds: string[] | null;

  /** Ставка на момент створення дня */
  @Column({ type: 'numeric', precision: 6, scale: 2, transformer: decimalTransformer })
  rate: number;

  /** Нараховано за день: сума часток ставки за кожну зараховану вправу (= rate, коли день completed) */
  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  earned: number;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => ExerciseRecord, (record) => record.session)
  records: Relation<ExerciseRecord>[];
}
