import { apiClient } from '../client';
import type { Activity, ActivityPeriod, ISODate, SuccessResponse } from '@/types';

export const activityApi = {
  /** Батько/мати: підсумки кроків за дні (значення за день на сервері лише зростає) */
  syncSteps: (days: { date: ISODate; steps: number }[]) =>
    apiClient.put<SuccessResponse>('/activity/steps', { days }).then((r) => r.data),
  /** Графік «Кроки і тренування» */
  get: (period: ActivityPeriod) =>
    apiClient.get<Activity>('/activity', { params: { period } }).then((r) => r.data),
};
