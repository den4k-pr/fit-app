import { Check, Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { RelationshipType } from '../../../common/enums';
import { AppBaseEntity } from '../../../database/base.entity';
import { decimalTransformer } from '../../../database/transformers/decimal.transformer';
import { User } from '../../users/entities/user.entity';

/**
 * Запрошення від дитини (розділ 5.5): 6-символьний код, діє 7 днів, одноразовий.
 * Нове запрошення знецінює попередні невикористані (`revokedAt`).
 */
@Entity({ name: 'invites' })
@Index('IDX_invites_used_by', ['usedById'])
@Index('UQ_invites_code', ['code'], { unique: true })
@Index('IDX_invites_child', ['childId'])
@Check('CHK_invites_code_format', `"code" ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'`)
export class Invite extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.invites, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'child_id' })
  child: Relation<User>;

  @Column({ type: 'uuid', name: 'child_id' })
  childId: string;

  /** Великі літери й цифри без 0 O 1 I L */
  @Column({ type: 'varchar', length: 6 })
  code: string;

  @Column({
    type: 'enum',
    enum: RelationshipType,
    enumName: 'relationship_type',
  })
  relationship: RelationshipType;

  /** Стартова ставка майбутньої сім'ї (null → за замовчуванням) */
  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  rate: number | null;

  /** Як дитина називатиме цього батька/матір */
  @Column({ type: 'varchar', length: 40, name: 'parent_label', nullable: true })
  parentLabel: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'used_by_id' })
  usedBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'used_by_id', nullable: true })
  usedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  /** Знецінено створенням нового запрошення */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
