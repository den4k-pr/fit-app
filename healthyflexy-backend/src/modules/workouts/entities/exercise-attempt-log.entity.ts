import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AttemptIssue } from '../../ai/ai-provider.interface';
import { UpdatableEntity } from '../../../database/base.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { DaySession } from './day-session.entity';
import { ExerciseRecord } from './exercise-record.entity';

/**
 * Кожна спроба AI-аналізу вправи (успішна чи ні) — окремий рядок (ТЗ: ExerciseAttemptLog).
 * `exerciseRecordId` проставляється лише коли спробу ПРИЙНЯТО (AI isCorrect + score ≥ порогу):
 * так видно повну історію спроб дитини/батьків, включно з відхиленими AI.
 */
@Entity({ name: 'exercise_attempt_logs' })
@Index('IDX_exercise_attempt_logs_record', ['exerciseRecordId'])
@Index('IDX_exercise_attempt_logs_exercise', ['exerciseId'])
@Index('IDX_exercise_attempt_logs_session_exercise', ['sessionId', 'exerciseId'])
@Check('CHK_exercise_attempt_logs_score_range', `"score" >= 0 AND "score" <= 100`)
export class ExerciseAttemptLog extends UpdatableEntity {
  @ManyToOne(() => DaySession, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'session_id' })
  session: Relation<DaySession>;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Relation<Exercise>;

  @Column({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'text', array: true, name: 'photo_keys' })
  photoKeys: string[];

  @Column({ type: 'boolean', name: 'is_correct' })
  isCorrect: boolean;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text' })
  feedback: string;

  @Column({ type: 'text' })
  recommendations: string;

  /** Проставляється, коли ця спроба стала прийнятим ExerciseRecord */
  @ManyToOne(() => ExerciseRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'exercise_record_id' })
  exerciseRecord: Relation<ExerciseRecord> | null;

  @Column({ type: 'uuid', name: 'exercise_record_id', nullable: true })
  exerciseRecordId: string | null;

  /** Відхилена спроба: що й на якій секунді виконано неправильно (для пояснення батьку/матері) */
  @Column({ type: 'jsonb', nullable: true })
  issues: AttemptIssue[] | null;

  @Column({ type: 'timestamptz', name: 'analyzed_at', default: () => 'now()' })
  analyzedAt: Date;
}
