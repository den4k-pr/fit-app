import { Check, Column, Entity, Index, OneToMany, OneToOne, Relation } from 'typeorm';
import { AppLanguage, UserRole } from '../../../common/enums';
import { UpdatableEntity } from '../../../database/base.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Family } from '../../families/entities/family.entity';
import { Invite } from '../../families/entities/invite.entity';

/**
 * Користувач (профіль). Ідентифікатор входу — номер телефону (E.164).
 * Розділ 12.1 ТЗ: таблиця `profiles` → тут `users` (окремого Supabase Auth немає).
 * Видалення користувача каскадно видаляє його сім'ю, дні, розрахунки, токени й запрошення (GDPR ст. 17).
 */
@Entity({ name: 'users' })
@Index('UQ_users_phone', ['phone'], { unique: true })
@Index('UQ_users_email', ['email'], { unique: true })
@Check('CHK_users_contact', `"phone" IS NOT NULL OR "email" IS NOT NULL`)
@Check('CHK_users_phone_e164', `"phone" ~ '^\\+[1-9][0-9]{6,14}$'`)
@Check('CHK_users_age', `"age" IS NULL OR ("age" >= 16 AND "age" <= 120)`)
export class User extends UpdatableEntity {
  /** E.164, напр. +48501234567 */
  /** E.164; null, якщо користувач зареєструвався через пошту */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** У нижньому регістрі; null, якщо користувач зареєструвався через телефон */
  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  /** Коли пошту підтверджено (правильний код із листа або вхід через Google); null — не підтверджено */
  @Column({ type: 'timestamptz', name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  /** Необов'язково (розділ 5.4 ТЗ) */
  @Column({ type: 'int', nullable: true })
  age: number | null;

  /** null до кроку «Вибір ролі». Після встановлення не змінюється (перевіряє UsersService). */
  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role', nullable: true })
  role: UserRole | null;

  @Column({ type: 'enum', enum: AppLanguage, enumName: 'app_language', default: AppLanguage.UK })
  language: AppLanguage;

  /** IANA-таймзона пристрою, напр. Europe/Warsaw. Оновлюється при кожному запуску застосунку. */
  @Column({ type: 'varchar', length: 64, default: 'Europe/Warsaw' })
  timezone: string;

  /** Expo push token (ExponentPushToken[...]) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  pushToken: string | null;

  /** Користувач може вимкнути сповіщення в профілі */
  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  /** Ключ фото-аватара у сховищі (`avatars/{userId}/…jpg`); null — емодзі-аватар */
  @Column({ type: 'varchar', length: 200, name: 'avatar_key', nullable: true })
  avatarKey: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  gdprConsentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  disclaimerSeenAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** Заблоковано в адмінці: вхід і всі запити → 403 ACCOUNT_BLOCKED */
  @Column({ type: 'timestamptz', name: 'blocked_at', nullable: true })
  blockedAt: Date | null;

  // ── Зв'язки ──
  @OneToOne(() => Family, (family) => family.parent)
  familyAsParent: Relation<Family> | null;

  @OneToMany(() => Family, (family) => family.child)
  familiesAsChild: Relation<Family>[];

  @OneToMany(() => Invite, (invite) => invite.child)
  invites: Relation<Invite>[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: Relation<RefreshToken>[];
}
