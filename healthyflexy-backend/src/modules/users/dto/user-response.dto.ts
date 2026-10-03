import { AppLanguage, UserRole } from '../../../common/enums';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  /** null → користувач зареєструвався через пошту */
  phone: string | null;

  /** null → користувач зареєструвався через телефон */
  email: string | null;

  /** Пошту підтверджено кодом із листа (або через Google) */
  emailVerified: boolean;
  name: string | null;
  age: number | null;

  /** Підписане посилання на фото-аватар (живе добу); null — емодзі-аватар */
  avatarUrl: string | null;

  /** null → користувач ще не обрав роль */
  role: UserRole | null;
  language: AppLanguage;

  /** IANA, напр. Europe/Warsaw */
  timezone: string;
  pushEnabled: boolean;
  gdprConsentAt: Date | null;
  disclaimerSeenAt: Date | null;
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.phone = user.phone;
    dto.email = user.email;
    dto.emailVerified = !!user.emailVerifiedAt;
    dto.name = user.name;
    dto.age = user.age;
    dto.avatarUrl = null;
    dto.role = user.role;
    dto.language = user.language;
    dto.timezone = user.timezone;
    dto.pushEnabled = user.pushEnabled;
    dto.gdprConsentAt = user.gdprConsentAt;
    dto.disclaimerSeenAt = user.disclaimerSeenAt;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
