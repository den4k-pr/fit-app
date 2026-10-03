import type { AppLanguage, UserRole } from '../enums';
import type { ISODateTime, PhoneE164 } from '../common';

/** GET /users/me */
export interface User {
  id: string;
  /** null → акаунт створено через пошту */
  phone: PhoneE164 | null;
  /** null → акаунт створено через телефон */
  email: string | null;
  /** Пошту підтверджено кодом із листа (або через Google) */
  emailVerified?: boolean;
  name: string | null;
  age: number | null;
  /** Підписане посилання на фото-аватар; null — емодзі */
  avatarUrl: string | null;
  /** null → роль ще не обрано */
  role: UserRole | null;
  language: AppLanguage;
  /** IANA, напр. Europe/Warsaw */
  timezone: string;
  pushEnabled: boolean;
  gdprConsentAt: ISODateTime | null;
  disclaimerSeenAt: ISODateTime | null;
  createdAt: ISODateTime;
}

/** PATCH /users/me — усі поля необов'язкові */
export interface UpdateProfileRequest {
  name?: string;
  age?: number;
  language?: AppLanguage;
  timezone?: string;
  pushEnabled?: boolean;
}

/** PUT /users/me/role */
export interface SetRoleRequest {
  role: UserRole;
}

/** POST /users/me/consent — усі три чекбокси обов'язкові */
export interface AcceptConsentRequest {
  termsAndPrivacyAccepted: true;
  disclaimerAccepted: true;
  doctorConsultationConfirmed: true;
}

/** PUT /users/me/push-token (`null` очищає токен) */
export interface UpdatePushTokenRequest {
  pushToken: string | null;
}

/** POST /users/me/avatar/upload */
export interface AvatarUploadResponse {
  avatarKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}
