import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Analytics, AppConfig, Exercise, Program, UserDetail, UserRow } from './types';

export const useAnalytics = (days: number) =>
  useQuery({ queryKey: ['analytics', days], queryFn: async () => (await api.get<Analytics>('/analytics', { params: { days } })).data });

export interface UsersFilter {
  search: string;
  role: '' | 'parent' | 'child' | 'none';
  status: '' | 'active' | 'blocked';
  sort: 'createdAt' | 'lastLoginAt' | 'name';
  page: number;
}

export const useUsers = (f: UsersFilter) =>
  useQuery({
    queryKey: ['users', f],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await api.get<{ items: UserRow[]; total: number }>('/users', {
          params: {
            search: f.search || undefined,
            role: f.role || undefined,
            status: f.status || undefined,
            sort: f.sort,
            page: f.page,
            limit: 20,
          },
        })
      ).data,
  });

export const useUser = (id: string) =>
  useQuery({ queryKey: ['user', id], queryFn: async () => (await api.get<UserDetail>(`/users/${id}`)).data });

export function useUserMutations(id: string) {
  const qc = useQueryClient();
  const done = (data?: UserDetail) => {
    if (data) qc.setQueryData(['user', id], data);
    void qc.invalidateQueries({ queryKey: ['users'] });
  };
  return {
    update: useMutation({
      mutationFn: async (body: { name?: string; age?: number | null; language?: string }) => (await api.patch<UserDetail>(`/users/${id}`, body)).data,
      onSuccess: done,
    }),
    block: useMutation({
      mutationFn: async (blocked: boolean) => (await api.post<UserDetail>(`/users/${id}/block`, { blocked })).data,
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: async () => {
        await api.delete(`/users/${id}`);
      },
      onSuccess: () => {
        qc.removeQueries({ queryKey: ['user', id] });
        void qc.invalidateQueries({ queryKey: ['users'] });
        void qc.invalidateQueries({ queryKey: ['analytics'] });
      },
    }),
  };
}

export const useExercises = () =>
  useQuery({ queryKey: ['exercises'], queryFn: async () => (await api.get<Exercise[]>('/exercises')).data });

export const useExercise = (id: string | undefined) =>
  useQuery({ queryKey: ['exercise', id], enabled: !!id, queryFn: async () => (await api.get<Exercise>(`/exercises/${id}`)).data });

export function useSaveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      (id ? await api.patch<Exercise>(`/exercises/${id}`, body) : await api.post<Exercise>('/exercises', body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['exercise', data.id], data);
      void qc.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<{ deleted: boolean; deactivated: boolean }>(`/exercises/${id}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

export const usePrograms = () =>
  useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get<Program[]>('/programs')).data });

export const useProgram = (id: string | undefined) =>
  useQuery({ queryKey: ['program', id], enabled: !!id, queryFn: async () => (await api.get<Program>(`/programs/${id}`)).data });

export function useProgramMutations() {
  const qc = useQueryClient();
  const refresh = (data?: Program) => {
    if (data) qc.setQueryData(['program', data.id], data);
    void qc.invalidateQueries({ queryKey: ['programs'] });
  };
  return {
    save: useMutation({
      mutationFn: async ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
        (id ? await api.patch<Program>(`/programs/${id}`, body) : await api.post<Program>('/programs', body)).data,
      onSuccess: refresh,
    }),
    archive: useMutation({
      mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => (await api.post<Program>(`/programs/${id}/archive`, { archived })).data,
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => (await api.delete<{ deleted: boolean; archived: boolean }>(`/programs/${id}`)).data,
      onSuccess: () => refresh(),
    }),
  };
}

export const useAppConfig = () =>
  useQuery({ queryKey: ['app-config'], queryFn: async () => (await api.get<AppConfig>('/app-config')).data });

export function useSaveAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Pick<AppConfig, 'theme' | 'content'>> & { limits?: Partial<AppConfig['limits']> }) =>
      (await api.put<AppConfig>('/app-config', body)).data,
    onSuccess: (data) => qc.setQueryData(['app-config'], data),
  });
}
