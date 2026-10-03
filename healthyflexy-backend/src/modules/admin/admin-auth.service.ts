import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { EnvironmentVariables } from '../../config';

export interface AdminTokens {
  accessToken: string;
  refreshToken: string;
  /** Скільки секунд живе access-токен */
  expiresIn: number;
}

interface AdminJwtPayload {
  sub: 'admin';
  email: string;
  typ: 'admin-access' | 'admin-refresh';
  /** Версія облікових даних: зміна ADMIN_EMAIL/ADMIN_PASSWORD анулює всі видані токени */
  pv: string;
}

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Єдиний адмін-акаунт CRM: логін і пароль — у змінних оточення (ADMIN_EMAIL / ADMIN_PASSWORD).
 * JWT (access 1 год + refresh 14 днів) підписуються ОКРЕМИМ секретом і мають власний `typ`,
 * тож користувацький токен ніколи не пройде як адмінський і навпаки.
 */
@Injectable()
export class AdminAuthService {
  private readonly jwt = new JwtService({});

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get enabled(): boolean {
    return (
      !!this.config.get('ADMIN_EMAIL', { infer: true }) &&
      !!this.config.get('ADMIN_PASSWORD', { infer: true })
    );
  }

  get email(): string | null {
    return this.config.get('ADMIN_EMAIL', { infer: true })?.trim().toLowerCase() ?? null;
  }

  private credentials(): { email: string; password: string } {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password)
      throw new AppException(ErrorCode.ADMIN_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    return { email: email.trim().toLowerCase(), password };
  }

  private secret(): string {
    return (
      this.config.get('ADMIN_JWT_SECRET', { infer: true }) ??
      sha256(`admin:${this.config.get('JWT_ACCESS_SECRET', { infer: true })}`)
    );
  }

  private version(): string {
    const { email, password } = this.credentials();
    return sha256(`${email}\n${password}`).slice(0, 16);
  }

  async login(email: string, password: string): Promise<AdminTokens> {
    const expected = this.credentials();
    // порівняння хешів однакової довжини за сталий час (без підказок про довжину пароля)
    const same = (a: string, b: string) =>
      timingSafeEqual(Buffer.from(sha256(a)), Buffer.from(sha256(b)));
    const okEmail = same(email.trim().toLowerCase(), expected.email);
    const okPassword = same(password, expected.password);
    if (!okEmail || !okPassword) {
      throw new AppException(ErrorCode.ADMIN_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
    }
    return this.issue(expected.email);
  }

  async refresh(refreshToken: string): Promise<AdminTokens> {
    const payload = await this.verify(refreshToken, 'admin-refresh');
    return this.issue(payload.email);
  }

  /** Перевірка токена для AdminGuard; кидає UNAUTHORIZED / TOKEN_EXPIRED */
  async verify(
    token: string,
    typ: AdminJwtPayload['typ'] = 'admin-access',
  ): Promise<AdminJwtPayload> {
    let payload: AdminJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminJwtPayload>(token, { secret: this.secret() });
    } catch (error) {
      const expired = error instanceof Error && error.name === 'TokenExpiredError';
      throw new AppException(
        expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.typ !== typ || payload.sub !== 'admin' || payload.pv !== this.version()) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    return payload;
  }

  private async issue(email: string): Promise<AdminTokens> {
    const base = { sub: 'admin' as const, email, pv: this.version() };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, typ: 'admin-access' },
        { secret: this.secret(), expiresIn: ACCESS_TTL_SECONDS },
      ),
      this.jwt.signAsync(
        { ...base, typ: 'admin-refresh' },
        { secret: this.secret(), expiresIn: REFRESH_TTL_SECONDS },
      ),
    ]);
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
  }
}
