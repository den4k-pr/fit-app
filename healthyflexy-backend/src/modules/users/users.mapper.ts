import { UserResponseDto } from './dto';
import { User } from './entities/user.entity';

/** `avatarUrl` — підписане посилання на фото-аватар (рахується окремо, бо потребує сховища) */
export const toUserResponse = (user: User, avatarUrl: string | null = null): UserResponseDto => ({
  id: user.id,
  phone: user.phone,
  email: user.email,
  emailVerified: !!user.emailVerifiedAt,
  name: user.name,
  age: user.age,
  avatarUrl,
  role: user.role,
  language: user.language,
  timezone: user.timezone,
  pushEnabled: user.pushEnabled,
  gdprConsentAt: user.gdprConsentAt,
  disclaimerSeenAt: user.disclaimerSeenAt,
  createdAt: user.createdAt,
});
