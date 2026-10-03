import { Column, Entity, Index, JoinColumn, ManyToOne, Relation, Unique } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { Program } from './program.entity';

/**
 * Вправа у складі програми: порядок, дні тижня, необов'язковий override
 * `targetReps`/`targetSeconds`/`targetSteps` (null → береться значення з Exercise).
 */
@Entity({ name: 'program_exercises' })
@Index('IDX_program_exercises_exercise', ['exerciseId'])
@Unique('UQ_program_exercises_program_sort', ['programId', 'sortOrder'])
@Index('IDX_program_exercises_program', ['programId'])
export class ProgramExercise extends AppBaseEntity {
  @ManyToOne(() => Program, (program) => program.exercises, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'program_id' })
  program: Relation<Program>;

  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Relation<Exercise>;

  @Column({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'int', name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'int', name: 'target_reps', nullable: true })
  targetReps: number | null;

  @Column({ type: 'int', name: 'target_seconds', nullable: true })
  targetSeconds: number | null;

  @Column({ type: 'int', name: 'target_steps', nullable: true })
  targetSteps: number | null;

  /** ISO: 1 = Пн … 7 = Нд. За замовчуванням — усі дні (обмежує лише plan_days сім'ї). */
  @Column({ type: 'smallint', array: true, name: 'plan_days', default: () => `'{1,2,3,4,5,6,7}'` })
  planDays: number[];
}
