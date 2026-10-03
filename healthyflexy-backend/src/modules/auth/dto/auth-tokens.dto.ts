export class AuthTokensDto {
  /** JWT, живе 15 хв. Передається як `Authorization: Bearer <token>` */
  accessToken: string;

  /** Час життя access-токена, секунди */
  accessTokenExpiresIn: number;

  /** Непрозорий випадковий рядок (256 біт). Зберігати ЛИШЕ в SecureStore */
  refreshToken: string;

  /** Коли refresh-токен спливе (≈30 днів) */
  refreshTokenExpiresAt: Date;
}
