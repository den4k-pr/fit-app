import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { UpdatableEntity } from '../../../database/base.entity';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { Program } from './program.entity';

/**
 * Призначена програма для сім'ї. Лише ОДНЕ активне призначення на сім'ю
 * (частковий унікальний індекс `WHERE is_active`, той самий трюк, що й `UQ_ledger_entries_one_earn_per_session`).
 * Призначає завжди дитина (`assignedById`); `startDate` — «з завтра», як і зміни плану/ставки.
 */
@Entity({ name: 'user_program_assignments' })
@Index('IDX_user_program_assignments_program', ['programId'])
@Index('IDX_user_program_assignments_assigned_by', ['assignedById'])
@Index('IDX_user_program_assignments_family', ['familyId'])
export class UserProgramAssignment extends UpdatableEntity {
  @ManyToOne(() => Family, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'family_id' })
  family: Relation<Family>;

  @Column({ type: 'uuid', name: 'family_id' })
  familyId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'program_id' })
  program: Relation<Program>;

  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  /**
   * CASCADE (не RESTRICT): при видаленні акаунта дитини (яка й призначає програми) рядок однаково
   * зникає разом із сім'єю через `family_id` CASCADE — RESTRICT тут лише блокував DELETE /users/me.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: Relation<User>;

  @Column({ type: 'uuid', name: 'assigned_by_id' })
  assignedById: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
