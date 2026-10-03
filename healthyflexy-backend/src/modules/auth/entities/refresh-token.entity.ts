import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { DevicePlatform } from '../../../common/enums';
import { AppBaseEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Refresh-токен (30 днів) із ротацією: при кожному /auth/refresh старий відкликається,
 * а `replacedByTokenId` вказує на новий. Повторне використання відкликаного токена = ознака крадіжки
 * → відкликаємо весь ланцюжок користувача.
 * Зберігається лише SHA-256/HMAC-хеш; сам токен живе на пристрої в SecureStore.
 */
@Entity({ name: 'refresh_tokens' })
@Index('UQ_refresh_tokens_hash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_tokens_user', ['userId'])
@Index('IDX_refresh_tokens_expires_at', ['expiresAt'])
export class RefreshToken extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /** hex(HMAC-SHA256) — 64 символи */
  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  /** Ідентифікатор інсталяції застосунку (генерується клієнтом) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId: string | null;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    enumName: 'device_platform',
    nullable: true,
  })
  platform: DevicePlatform | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  appVersion: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Токен, що замінив цей при ротації */
  @Column({ type: 'uuid', nullable: true })
  replacedByTokenId: string | null;
}
