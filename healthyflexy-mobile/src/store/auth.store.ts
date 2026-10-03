import { create } from 'zustand';
import type { User } from '@/types';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** null = ще не перевіряли; false = сім'ї немає (батько/мати → екран «Чекаємо на запрошення») */
  hasFamily: boolean | null;
  setSignedIn: (user: User) => void;
  setUser: (user: User) => void;
  setHasFamily: (hasFamily: boolean | null) => void;
  setSignedOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  hasFamily: null,
  setSignedIn: (user) => set({ status: 'signedIn', user }),
  setUser: (user) => set({ user }),
  setHasFamily: (hasFamily) => set({ hasFamily }),
  setSignedOut: () => set({ status: 'signedOut', user: null, hasFamily: null }),
}));

/**
 * Чи можна питати дані сім'ї (статистика, календар, розрахунки…). Поки сім'ї ще немає (реєстрація,
 * очікування батька/матері) — ні: такі запити лише повертали б 404 FAMILY_NOT_FOUND. null (ще не перевірено) — так.
 */
export const useFamilyReady = (): boolean => useAuthStore((s) => s.hasFamily !== false);
