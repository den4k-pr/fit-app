import { apiClient } from '../client';
import type { Exercise } from '@/types';

export const exercisesApi = {
  list: () => apiClient.get<Exercise[]>('/exercises').then((r) => r.data),
};
