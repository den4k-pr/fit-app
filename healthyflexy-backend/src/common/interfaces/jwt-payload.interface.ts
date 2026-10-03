import { UserRole } from '../enums';

/** Вміст access-токена. Мінімальний: решту дістаємо з БД. */
export interface JwtAccessPayload {
  /** user.id */
  sub: string;
  /** null — користувач ще не обрав роль (крок 3 реєстрації) */
  role: UserRole | null;
  iat?: number;
  exp?: number;
}
