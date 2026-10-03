import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { UserRole } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { UpdateProfileDto } from './dto';
import { StorageService } from '../storage/storage.service';
import { User } from './entities/user.entity';

const PG_UNIQUE_VIOLATION = '23505';

/** Профіль користувача. Усі методи працюють із поточним користувачем; чужі дані сюди не потрапляють. */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  /** Підписане посилання на фото-аватар користувача (null — емодзі) */
  avatarUrlOf(user: Pick<User, 'avatarKey'>): Promise<string | null> {
    return this.storage.avatarUrl(user.avatarKey);
  }

  /** Новий фото-аватар: файл має бути вже завантажений; старий файл видаляється */
  async setAvatar(userId: string, avatarKey: string): Promise<User> {
    await this.storage.assertAvatarUploaded(userId, avatarKey);
    const user = await this.requireById(userId);
    const previous = user.avatarKey;
    user.avatarKey = avatarKey;
    await this.users.save(user);
    if (previous && previous !== avatarKey)
      await this.storage.deleteKeys([previous]).catch(() => undefined);
    return user;
  }

  async removeAvatar(userId: string): Promise<User> {
    const user = await this.requireById(userId);
    if (user.avatarKey) await this.storage.deleteKeys([user.avatarKey]).catch(() => undefined);
    user.avatarKey = null;
    return this.users.save(user);
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.users.findOne({ where: { phone } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  /** Вхід за поштою (адреса вже в нижньому регістрі): існуючий користувач або новий. */
  async findOrCreateByEmail(email: string): Promise<{ user: User; created: boolean }> {
    const existing = await this.findByEmail(email);
    if (existing) return { user: existing, created: false };
    try {
      const user = await this.users.save(this.users.create({ email }));
      return { user, created: true };
    } catch (error) {
      if ((error as { code?: string }).code !== PG_UNIQUE_VIOLATION) throw error;
      const raced = await this.findByEmail(email);
      if (!raced) throw error;
      return { user: raced, created: false };
    }
  }

  /** Вхід за телефоном: існуючий користувач або новий. Гонка двох перших входів → unique → перечитуємо. */
  async findOrCreateByPhone(phone: string): Promise<{ user: User; created: boolean }> {
    const existing = await this.findByPhone(phone);
    if (existing) return { user: existing, created: false };
    try {
      const user = await this.users.save(this.users.create({ phone }));
      return { user, created: true };
    } catch (error) {
      if ((error as { code?: string }).code !== PG_UNIQUE_VIOLATION) throw error;
      const raced = await this.findByPhone(phone);
      if (!raced) throw error;
      return { user: raced, created: false };
    }
  }

  async requireById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.requireById(userId);
    // DTO-класи мають поля без ініціалізатора: після компіляції вони є власними `undefined`-властивостями,
    // тому копіюємо лише передані значення (інакше PATCH {age} стирав би ім'я)
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.age !== undefined) user.age = dto.age;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;
    if (dto.pushEnabled !== undefined) user.pushEnabled = dto.pushEnabled;
    return this.users.save(user);
  }

  /** Роль обирається один раз (ТЗ §5.3) і лише після згоди */
  /**
   * Роль. Під час реєстрації її можна виправити (кнопка «Назад» з наступних кроків), поки людина ще ні з ким
   * не з'єднана: щойно є сім'я (приєднався батько/мати або прийнято запрошення) — роль остаточна (ROLE_ALREADY_SET).
   * Повтор тієї самої ролі — без змін. Перехід із дитини: її невикористані запрошення відкликаються.
   */
  async setRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.requireById(userId);
    if (!user.gdprConsentAt)
      throw new AppException(ErrorCode.CONSENT_REQUIRED, HttpStatus.FORBIDDEN);
    if (user.role === role) return user;
    if (user.role) {
      const rows: Array<{ n: number }> = await this.users.manager.query(
        `SELECT count(*)::int AS n FROM families WHERE child_id = $1 OR parent_id = $1`,
        [user.id],
      );
      if ((rows[0]?.n ?? 0) > 0)
        throw new AppException(ErrorCode.ROLE_ALREADY_SET, HttpStatus.CONFLICT);
      if (user.role === UserRole.CHILD)
        await this.users.manager.query(
          `UPDATE invites SET revoked_at = now()
            WHERE child_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
          [user.id],
        );
    }
    user.role = role;
    return this.users.save(user);
  }

  async acceptConsent(userId: string): Promise<User> {
    const user = await this.requireById(userId);
    const now = new Date();
    user.gdprConsentAt ??= now;
    user.disclaimerSeenAt ??= now;
    return this.users.save(user);
  }

  async setPushToken(userId: string, token: string | null): Promise<void> {
    await this.users.update({ id: userId }, { pushToken: token });
  }

  /** Пошту підтверджено (код із листа / Google). Лише перше підтвердження: дата не перезаписується */
  async markEmailVerified(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;
    user.emailVerifiedAt = new Date();
    await this.users.update({ id: user.id }, { emailVerifiedAt: user.emailVerifiedAt });
  }

  async touchLogin(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { lastLoginAt: new Date() });
  }
}
