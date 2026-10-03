import { apiClient } from '../client';
import type { Program, ProgramAssignment, SaveProgramRequest } from '@/types';

export const programsApi = {
  presets: () => apiClient.get<Program[]>('/programs/presets').then((r) => r.data),
  mine: () => apiClient.get<Program[]>('/programs/mine').then((r) => r.data),
  create: (body: SaveProgramRequest) => apiClient.post<Program>('/programs', body).then((r) => r.data),
  update: (id: string, body: SaveProgramRequest) =>
    apiClient.patch<Program>(`/programs/${id}`, body).then((r) => r.data),
  assign: (id: string) => apiClient.post<ProgramAssignment>(`/programs/${id}/assign`).then((r) => r.data),
  currentAssignment: () =>
    apiClient.get<ProgramAssignment | null>('/programs/assignment/current').then((r) => r.data),
};
