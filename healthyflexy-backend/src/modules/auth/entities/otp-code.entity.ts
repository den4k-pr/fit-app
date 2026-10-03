import { Check, Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

/**
 * Одноразовий код входу. Сам код не зберігається: лише HMAC-SHA256(код, TOKEN_HASH_SECRET).
 * Правила (ТЗ §5.4 задає лише паузу 60 с; решту значень обрано при проєктуванні): 6 цифр, TTL 5 хв, ≤5 невірних спроб на код,
 * пауза 60 с між запитами, ≤5 запитів на номер за 10 хв.
 */
@Entity({ name: 'otp_codes' })
@Index('IDX_otp_codes_target_created', ['target', 'createdAt'])
@Index('IDX_otp_codes_expires_at', ['expiresAt'])
@Check('CHK_otp_codes_attempts', `"attempts" >= 0`)
export class OtpCode extends AppBaseEntity {
  /** Кому надіслано код: номер E.164 або адреса пошти в нижньому регістрі */
  @Column({ type: 'varchar', length: 254 })
  target: string;

  /** hex(HMAC-SHA256) — 64 символи */
  @Column({ type: 'varchar', length: 64 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** Кількість невірних вводів цього коду */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Заповнюється при успішній перевірці — повторно використати код не можна */
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  /** IP запиту (для аналізу зловживань) */
  @Column({ type: 'varchar', length: 45, nullable: true })
  requestIp: string | null;
}
