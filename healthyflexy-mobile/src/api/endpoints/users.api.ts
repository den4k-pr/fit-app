import { apiClient } from '../client';
import type {
  AcceptConsentRequest,
  AvatarUploadResponse,
  SetRoleRequest,
  SuccessResponse,
  UpdateProfileRequest,
  UpdatePushTokenRequest,
  User,
} from '@/types';

export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me').then((r) => r.data),
  updateProfile: (body: UpdateProfileRequest) =>
    apiClient.patch<User>('/users/me', body).then((r) => r.data),
  setRole: (body: SetRoleRequest) =>
    apiClient.put<User>('/users/me/role', body).then((r) => r.data),
  acceptConsent: (body: AcceptConsentRequest) =>
    apiClient.post<User>('/users/me/consent', body).then((r) => r.data),
  updatePushToken: (body: UpdatePushTokenRequest) =>
    apiClient.put<SuccessResponse>('/users/me/push-token', body).then((r) => r.data),
  createAvatarUpload: (sizeBytes: number) =>
    apiClient.post<AvatarUploadResponse>('/users/me/avatar/upload', { sizeBytes }).then((r) => r.data),
  setAvatar: (avatarKey: string) =>
    apiClient.put<User>('/users/me/avatar', { avatarKey }).then((r) => r.data),
  removeAvatar: () => apiClient.delete<User>('/users/me/avatar').then((r) => r.data),
  deleteAccount: () => apiClient.delete<SuccessResponse>('/users/me').then((r) => r.data),
};
