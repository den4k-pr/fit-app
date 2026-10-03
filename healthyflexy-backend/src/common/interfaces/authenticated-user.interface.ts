import { AppLanguage, UserRole } from '../enums';

/** Те, що JwtAuthGuard кладе в `request.user` і що повертає декоратор @CurrentUser(). */
export interface AuthenticatedUser {
  id: string;
  phone: string | null;
  email: string | null;
  role: UserRole | null;
  language: AppLanguage;
  timezone: string;
}
