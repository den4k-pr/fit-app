import type { DevicePlatform } from '../enums';
import type { ISODateTime, PhoneE164 } from '../common';
import type { User } from './users';

/** POST /auth/otp/request */
export interface RequestOtpRequest {
  phone: PhoneE164;
}
export interface RequestOtpResponse {
  /** Через скільки секунд можна запросити код знову */
  retryAfterSeconds: number;
  expiresInSeconds: number;
}

/** POST /auth/otp/verify */
/** POST /auth/email/request: код на пошту */
export interface RequestEmailOtpRequest {
  email: string;
}

/** POST /auth/email/verify */
export interface VerifyEmailOtpRequest {
  email: string;
  /** 6 цифр */
  code: string;
  deviceId?: string;
  platform?: DevicePlatform;
  appVersion?: string;
}

/** GET /auth/config */
export interface AuthConfig {
  /** Завжди true: вхід лише з кодом із листа/SMS */
  otpRequired: boolean;
  /** Вхід кодом на пошту доступний (сервер справді надсилає листи) */
  emailEnabled?: boolean;
  /** Вхід кодом із SMS доступний (на сервері налаштовано SMS-провайдера) */
  phoneEnabled?: boolean;
  /** Вхід через Google доступний (на сервері налаштовано Client ID) */
  googleEnabled?: boolean;
}

/** POST /auth/google: вхід через Google — ID-токен від Google */
export interface GoogleAuthRequest {
  idToken: string;
  deviceId?: string;
  platform?: DevicePlatform;
  appVersion?: string;
}


export interface VerifyOtpRequest {
  phone: PhoneE164;
  /** 6 цифр */
  code: string;
  deviceId?: string;
  platform?: DevicePlatform;
  appVersion?: string;
}

export interface AuthTokens {
  accessToken: string;
  /** секунди */
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: ISODateTime;
}

export interface VerifyOtpResponse {
  tokens: AuthTokens;
  user: User;
  /** true → акаунт щойно створено: далі «Вибір ролі» */
  isNewUser: boolean;
}

/** POST /auth/refresh */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** POST /auth/logout */
export interface LogoutRequest {
  refreshToken: string;
}
