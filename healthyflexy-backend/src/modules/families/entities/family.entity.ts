import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Relation,
} from 'typeorm';
import { Currency, ExerciseMode, RelationshipType, WorkoutType } from '../../../common/enums';
import { UpdatableEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { DaySession } from '../../workouts/entities/day-session.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Сім'я = пара «дитина + батько/мати» з власним планом та ставкою.
 * Дитина може мати кілька сімей (мама, тато, бабуся — кожен зі своїм планом); `parent_id` унікальний
 * (батько/мати лише в одній сім'ї). Обрану сім'ю дитина передає заголовком `X-Family-Id`.
 */
@Entity({ name: 'families' })
@Index('UQ_families_parent', ['parentId'], { unique: true })
@Index('IDX_families_child', ['childId'])
@Check('CHK_families_distinct_members', `"child_id" <> "parent_id"`)
@Check('CHK_families_rate_range', `"rate" >= 1 AND "rate" <= 20`)
@Check('CHK_families_rate_step', `MOD("rate" * 2, 1) = 0`)
@Check('CHK_families_exercise_mode', `"exercise_mode" IN ('ai', 'manual')`)
@Check(
  'CHK_families_plan_days',
  `cardinality("plan_days") BETWEEN 1 AND 7 AND "plan_days" <@ ARRAY[1,2,3,4,5,6,7]::smallint[]`,
)
export class Family extends UpdatableEntity {
  @ManyToOne(() => User, (user) => user.familiesAsChild, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'child_id' })
  child: Relation<User>;

  @Column({ type: 'uuid', name: 'child_id' })
  childId: string;

  @OneToOne(() => User, (user) => user.familyAsParent, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'parent_id' })
  parent: Relation<User>;

  @Column({ type: 'uuid', name: 'parent_id' })
  parentId: string;

  /** Впливає на підпис («Мама») та рід дієслів у push */
  @Column({
    type: 'enum',
    enum: RelationshipType,
    enumName: 'relationship_type',
    default: RelationshipType.MOM,
  })
  relationship: RelationshipType;

  /** Ставка за виконаний день: 1–20, крок 0.5 (розділ 7.2). Зміни діють з наступного дня. */
  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    default: 5,
    transformer: decimalTransformer,
  })
  rate: number;

  /** Лише мітка обліку; конвертації немає */
  @Column({ type: 'enum', enum: Currency, enumName: 'currency_code', default: Currency.EUR })
  currency: Currency;

  /** Дні занять, ISO: 1 = Пн … 7 = Нд. За замовчуванням Пн, Вт, Чт, Пт. */
  @Column({ type: 'smallint', array: true, default: () => `'{1,2,4,5}'` })
  planDays: number[];

  /** Час локального нагадування батьку/матері, 'HH:mm:ss' (у БД тип time) */
  @Column({ type: 'time', default: '10:00:00' })
  reminderTime: string;

  /** Як дитина називає батька/матір у перемикачі («Мама», «Бабуся Олена»); null → ім'я з профілю */
  @Column({ type: 'varchar', length: 40, name: 'parent_label', nullable: true })
  parentLabel: string | null;

  /** «Види навантаження»: які види вправ входять у день (за замовчуванням усі) */
  @Column({
    type: 'text',
    array: true,
    name: 'workout_types',
    default: () =>
      `'{strength,cardio,morning,stretch,warmup,breathing,walking,meditation,coordination}'`,
  })
  workoutTypes: WorkoutType[];

  /** «Час тренування»: бюджет дня в хвилинах без урахування ходьби (5–60) */
  @Column({ type: 'smallint', name: 'workout_minutes', default: 15 })
  workoutMinutes: number;

  /** «Автоускладнення»: щотижневе зростання цілей вправ */
  @Column({ type: 'boolean', name: 'auto_progression', default: false })
  autoProgression: boolean;

  /** Темп зростання, % на тиждень (1–100) */
  @Column({ type: 'smallint', name: 'progression_pct', default: 5 })
  progressionPct: number;

  /** З якої дати рахуються тижні автоускладнення (дата ввімкнення); null — вимкнено */
  @Column({ type: 'date', name: 'progression_start_date', nullable: true })
  progressionStartDate: string | null;

  /**
   * Як добираються вправи дня: `ai` (за замовчуванням) — алгоритм сам чергує силові, координацію, розтяжку й дихальні
   * та ступінь навантаження; `manual` — вправи, які спонсор відмітив у каталозі (`selectedExerciseIds`);
   * якщо їх немає — активна програма.
   */
  @Column({ type: 'varchar', length: 10, name: 'exercise_mode', default: ExerciseMode.AI })
  exerciseMode: ExerciseMode;

  /** Вправи каталогу, відмічені спонсором для щоденного плану (режим `manual`) */
  @Column({ type: 'uuid', array: true, name: 'selected_exercise_ids', default: () => `'{}'` })
  selectedExerciseIds: string[];

  /** Для ліміту «Нагадати» — не частіше ніж раз на 2 години */
  @Column({ type: 'timestamptz', nullable: true })
  lastReminderSentAt: Date | null;

  // ── Зв'язки ──
  @OneToMany(() => DaySession, (session) => session.family)
  sessions: Relation<DaySession>[];

  @OneToMany(() => LedgerEntry, (entry) => entry.family)
  ledger: Relation<LedgerEntry>[];
}
