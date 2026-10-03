import { apiClient } from '../client';
import type {
  AuthConfig,
  AuthTokens,
  GoogleAuthRequest,
  LogoutRequest,
  RequestEmailOtpRequest,
  VerifyEmailOtpRequest,
  RefreshTokenRequest,
  RequestOtpRequest,
  RequestOtpResponse,
  SuccessResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@/types';

export const authApi = {
  /** Чи потрібен код із SMS (false = тимчасовий вхід без коду) */
  getConfig: () => apiClient.get<AuthConfig>('/auth/config').then((r) => r.data),
  requestOtp: (body: RequestOtpRequest) =>
    apiClient.post<RequestOtpResponse>('/auth/otp/request', body).then((r) => r.data),
  requestEmailOtp: (body: RequestEmailOtpRequest) =>
    apiClient.post<RequestOtpResponse>('/auth/email/request', body).then((r) => r.data),
  verifyEmailOtp: (body: VerifyEmailOtpRequest) =>
    apiClient.post<VerifyOtpResponse>('/auth/email/verify', body).then((r) => r.data),
  /** Вхід через Google: ID-токен від Google → токени застосунку */
  google: (body: GoogleAuthRequest) =>
    apiClient.post<VerifyOtpResponse>('/auth/google', body).then((r) => r.data),
  verifyOtp: (body: VerifyOtpRequest) =>
    apiClient.post<VerifyOtpResponse>('/auth/otp/verify', body).then((r) => r.data),
  refresh: (body: RefreshTokenRequest) =>
    apiClient.post<AuthTokens>('/auth/refresh', body).then((r) => r.data),
  /** POST /auth/logout-all: відкликає токени всіх пристроїв */
  logoutAll: () => apiClient.post<SuccessResponse>('/auth/logout-all').then((r) => r.data),
  /** skipAuthRefresh: у тілі — поточний refresh-токен; ротація під час запиту зробила б його «повторним» */
  logout: (body: LogoutRequest) =>
    apiClient.post<SuccessResponse>('/auth/logout', body, { skipAuthRefresh: true }).then((r) => r.data),
};
