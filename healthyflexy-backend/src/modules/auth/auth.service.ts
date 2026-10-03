import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { EmailProviderName, EnvironmentVariables, NodeEnv, SmsProviderName } from '../../config';
import { AppLanguage } from '../../common/enums';
import { toUserResponse } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import {
  AuthConfigResponseDto,
  AuthTokensDto,
  LogoutDto,
  RequestEmailOtpDto,
  VerifyEmailOtpDto,
  RefreshTokenDto,
  RequestOtpDto,
  RequestOtpResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
  GoogleAuthDto,
} from './dto';
import { GoogleTokenService } from './google-token.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

/** Оркеструє вхід: OtpService.verify → знайти/створити User → TokenService.issue. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly google: GoogleTokenService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  requestOtp(
    dto: RequestOtpDto,
    ip: string | null,
    language: AppLanguage,
  ): Promise<RequestOtpResponseDto> {
    this.assertCountryAllowed(dto.phone);
    // SMS-сервіс ще не підключено: зрозуміла відповідь замість «не вдалося надіслати»
    if (!this.smsAvailable)
      throw new AppException(ErrorCode.SMS_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    return this.otp.issue(dto.phone, 'sms', ip, language);
  }

  /** Антишахрайство (ТЗ §5.4): SMS лише на дозволені країни. Порожній список = без обмежень. */
  private assertCountryAllowed(phone: string): void {
    const allowed = this.config
      .get('SMS_ALLOWED_COUNTRIES', { infer: true })
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (allowed.length === 0) return;
    const country = parsePhoneNumberFromString(phone)?.country;
    if (!country || !allowed.includes(country)) {
      throw new AppException(ErrorCode.PHONE_COUNTRY_NOT_ALLOWED, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  /** SMS справді надсилаються (SMSAPI / Twilio налаштовано) або це не production (код у лозі) */
  private get smsAvailable(): boolean {
    if (this.config.get('NODE_ENV', { infer: true }) !== NodeEnv.PRODUCTION) return true;
    const provider = this.config.get('SMS_PROVIDER', { infer: true });
    if (provider === SmsProviderName.SMSAPI)
      return !!this.config.get('SMSAPI_TOKEN', { infer: true });
    if (provider === SmsProviderName.TWILIO)
      return (
        !!this.config.get('TWILIO_ACCOUNT_SID', { infer: true }) &&
        !!this.config.get('TWILIO_AUTH_TOKEN', { infer: true })
      );
    return false;
  }

  getConfig(): AuthConfigResponseDto {
    const production = this.config.get('NODE_ENV', { infer: true }) === NodeEnv.PRODUCTION;
    return {
      otpRequired: true,
      emailEnabled:
        !production ||
        (this.config.get('EMAIL_PROVIDER', { infer: true }) === EmailProviderName.RESEND &&
          !!this.config.get('RESEND_API_KEY', { infer: true })),
      phoneEnabled: this.smsAvailable,
      googleEnabled: this.google.enabled,
    };
  }

  /** Код на пошту: та сама логіка й ліміти, що й для SMS (cooldown 60 с, 5 спроб, код на 5 хвилин) */
  requestEmailOtp(
    dto: RequestEmailOtpDto,
    ip: string | null,
    language: AppLanguage,
  ): Promise<RequestOtpResponseDto> {
    return this.otp.issue(dto.email, 'email', ip, language);
  }

  async verifyEmailOtp(dto: VerifyEmailOtpDto): Promise<VerifyOtpResponseDto> {
    await this.otp.verify(dto.email, dto.code);
    const { user, created } = await this.users.findOrCreateByEmail(dto.email);
    // код із листа введено правильно → пошта належить цій людині
    await this.users.markEmailVerified(user);
    await this.users.touchLogin(user.id);
    const tokens = await this.tokens.issue(user, dto);
    this.logger.log({
      event: 'login',
      method: 'email',
      userId: user.id,
      isNewUser: created,
      platform: dto.platform ?? null,
    });
    return { tokens, user: toUserResponse(user), isNewUser: created };
  }

  /** Вхід через Google: підтверджена пошта з ID-токена → той самий акаунт, що й при вході кодом на цю пошту */
  async loginWithGoogle(dto: GoogleAuthDto): Promise<VerifyOtpResponseDto> {
    const { email } = await this.google.verify(dto.idToken);
    const { user, created } = await this.users.findOrCreateByEmail(email);
    // Google віддає лише підтверджену пошту (email_verified)
    await this.users.markEmailVerified(user);
    await this.users.touchLogin(user.id);
    const tokens = await this.tokens.issue(user, dto);
    this.logger.log({
      event: 'login',
      method: 'google',
      userId: user.id,
      isNewUser: created,
      platform: dto.platform ?? null,
    });
    return { tokens, user: toUserResponse(user), isNewUser: created };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    await this.otp.verify(dto.phone, dto.code);
    const { user, created } = await this.users.findOrCreateByPhone(dto.phone);
    await this.users.touchLogin(user.id);
    const tokens = await this.tokens.issue(user, dto);
    this.logger.log({
      event: 'login',
      userId: user.id,
      isNewUser: created,
      platform: dto.platform ?? null,
    });
    return { tokens, user: toUserResponse(user), isNewUser: created };
  }

  refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.tokens.rotate(dto.refreshToken);
  }

  logout(userId: string, dto: LogoutDto): Promise<void> {
    return this.tokens.revoke(dto.refreshToken, userId);
  }

  /** «Вийти на всіх пристроях»: відкликає всі refresh-токени (загублений/чужий телефон) */
  logoutAll(userId: string): Promise<void> {
    return this.tokens.revokeAllForUser(userId);
  }
}
