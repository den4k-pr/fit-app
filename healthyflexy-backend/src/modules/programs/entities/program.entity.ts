import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { ProgramDurationType } from '../../../common/enums';
import { LocalizedText } from '../../../common/types';
import { UpdatableEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { ProgramExercise } from './program-exercise.entity';

/**
 * Програма тренувань: набір вправ для батька/матері, зібраний дитиною або взятий з готових пресетів.
 * Пресет (`isPreset: true`) — без автора (`createdById: null`), редагувати/видаляти не можна.
 */
@Entity({ name: 'programs' })
@Index('IDX_programs_preset', ['isPreset'])
@Index('IDX_programs_created_by', ['createdById'])
export class Program extends UpdatableEntity {
  /** Стабільний ключ ЛИШЕ для пресетів (ідемпотентний seed, як Exercise.slug); null для власних програм дітей */
  @Column({ type: 'varchar', length: 100, nullable: true })
  slug: string | null;

  /** { uk, pl, en } */
  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  description: LocalizedText | null;

  /** Короткий список переваг/вмісту для екрана деталей програми (переважно заповнений у пресетів) */
  @Column({ type: 'jsonb', nullable: true })
  highlights: LocalizedText[] | null;

  @Column({
    type: 'enum',
    enum: ProgramDurationType,
    enumName: 'program_duration_type',
    name: 'duration_type',
  })
  durationType: ProgramDurationType;

  @Column({ type: 'boolean', name: 'is_preset', default: false })
  isPreset: boolean;

  /** Пресет змінено в CRM: seed при старті більше не перезаписує його */
  @Column({ type: 'boolean', name: 'managed_by_admin', default: false })
  managedByAdmin: boolean;

  /** Пресет прибрано з каталогу в CRM (сім'ї, яким його вже призначено, продовжують за ним займатися) */
  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  @OneToMany(() => ProgramExercise, (pe) => pe.program)
  exercises: Relation<ProgramExercise>[];
}
