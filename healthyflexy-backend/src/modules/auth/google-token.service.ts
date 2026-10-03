import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { normalizeEmail } from '../../common/utils/email.util';
import { EnvironmentVariables } from '../../config';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** Поля ID-токена Google, які повертає tokeninfo (усі значення — рядки) */
interface GoogleTokenInfo {
  aud?: string;
  iss?: string;
  exp?: string;
  email?: string;
  email_verified?: string;
  name?: string;
}

/**
 * Перевірка ID-токена Google без SDK: endpoint tokeninfo сам перевіряє підпис і термін дії; ми додатково
 * звіряємо `aud` (лише наші Client ID), видавця, термін і підтверджену пошту. Отримуємо пошту → далі той самий
 * шлях, що й вхід кодом на пошту (findOrCreateByEmail): акаунт із цією поштою — той самий.
 */
@Injectable()
export class GoogleTokenService {
  private readonly logger = new Logger(GoogleTokenService.name);

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get clientIds(): string[] {
    return (this.config.get('GOOGLE_CLIENT_IDS', { infer: true }) ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  get enabled(): boolean {
    return this.clientIds.length > 0;
  }

  /** Повертає підтверджену пошту з токена; будь-яка невідповідність → GOOGLE_AUTH_FAILED */
  async verify(idToken: string): Promise<{ email: string; name: string | null }> {
    if (!this.enabled)
      throw new AppException(ErrorCode.GOOGLE_AUTH_DISABLED, HttpStatus.SERVICE_UNAVAILABLE);
    let info: GoogleTokenInfo | null = null;
    try {
      const response = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) info = (await response.json()) as GoogleTokenInfo;
    } catch (error) {
      this.logger.warn({ event: 'google_tokeninfo_failed', reason: String(error) });
    }
    const fail = (reason: string): never => {
      this.logger.warn({ event: 'google_auth_rejected', reason });
      throw new AppException(ErrorCode.GOOGLE_AUTH_FAILED, HttpStatus.UNAUTHORIZED);
    };
    if (!info) return fail('tokeninfo');
    if (!info.aud || !this.clientIds.includes(info.aud)) return fail('aud');
    if (!info.iss || !GOOGLE_ISSUERS.includes(info.iss)) return fail('iss');
    if (!info.exp || Number(info.exp) * 1000 < Date.now()) return fail('exp');
    if (!info.email || info.email_verified !== 'true') return fail('email');
    return { email: normalizeEmail(info.email), name: info.name?.trim() || null };
  }
}
