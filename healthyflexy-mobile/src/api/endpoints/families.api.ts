import { apiClient } from '../client';
import type {
  AcceptInviteRequest,
  CreateInviteRequest,
  Family,
  FamilyStats,
  Invite,
  ParentStatus,
  ReminderResponse,
  UpdateFamilyRequest,
  UpdatePlanRequest,
} from '@/types';

export const familiesApi = {
  createInvite: (body: CreateInviteRequest) =>
    apiClient.post<Invite>('/families/invites', body).then((r) => r.data),
  getActiveInvite: () =>
    apiClient.get<Invite | null>('/families/invites/active').then((r) => r.data),
  join: (body: AcceptInviteRequest) =>
    apiClient.post<Family>('/families/join', body).then((r) => r.data),
  getCurrent: () => apiClient.get<Family>('/families/current').then((r) => r.data),
  /** Усі сім'ї (у дитини — перемикач батьків) */
  list: () => apiClient.get<Family[]>('/families').then((r) => r.data),
  /** Перейменувати батька/матір у перемикачі (дитина) */
  rename: (body: UpdateFamilyRequest) =>
    apiClient.patch<Family>('/families/current', body).then((r) => r.data),
  updatePlan: (body: UpdatePlanRequest) =>
    apiClient.patch<Family>('/families/current/plan', body).then((r) => r.data),
  getStats: () => apiClient.get<FamilyStats>('/families/current/stats').then((r) => r.data),
  getParentStatus: () =>
    apiClient.get<ParentStatus>('/families/current/parent-status').then((r) => r.data),
  sendReminder: () =>
    apiClient.post<ReminderResponse>('/families/current/reminders').then((r) => r.data),
};
