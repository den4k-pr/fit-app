import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { DaySession } from './day-session.entity';

/**
 * Виконана вправа дня. Замість відео зберігаємо до 24 кадрів (`photo_keys`); пусто = вправа на кроки (`steps`).
 * Кадри видаляє purge-задача по `photos_expires_at`; сам запис лишається (`photos_deleted_at`).
 */
@Entity({ name: 'exercise_records' })
@Index('IDX_exercise_records_exercise', ['exerciseId'])
@Index('UQ_exercise_records_session_exercise', ['sessionId', 'exerciseId'], { unique: true })
@Index('IDX_exercise_records_photos_expiry', ['photosExpiresAt'], {
  where: `"photos_deleted_at" IS NULL AND cardinality("photo_keys") > 0`,
})
@Check('CHK_exercise_records_photos_max', `cardinality("photo_keys") <= 24`)
@Check(
  'CHK_exercise_records_photos_expiry',
  `cardinality("photo_keys") = 0 OR "photos_expires_at" IS NOT NULL`,
)
export class ExerciseRecord extends AppBaseEntity {
  @ManyToOne(() => DaySession, (session) => session.records, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'session_id' })
  session: Relation<DaySession>;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Relation<Exercise>;

  @Column({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  /** Ключі кадрів у сховищі: `{familyId}/{sessionId}/{exerciseId}/{1..24}.jpg` */
  @Column({ type: 'text', array: true, default: () => `'{}'` })
  photoKeys: string[];

  /** Скільки кроків нарахував крокомір (лише для вправ на кроки) */
  @Column({ type: 'int', nullable: true })
  steps: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  photosExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  photosDeletedAt: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  completedAt: Date;

  /** Вправу пропущено (не вдалася / не зарахована): день іде далі, оплати за неї немає */
  @Column({ type: 'boolean', default: false })
  skipped: boolean;
}
