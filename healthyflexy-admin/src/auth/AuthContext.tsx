import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, onTokensChange, tokenStore, type Tokens } from '@/api/client';

interface AuthValue {
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setAuthed] = useState(() => tokenStore.get() !== null);
  useEffect(() => onTokensChange((t) => setAuthed(t !== null)), []);

  const value: AuthValue = {
    isAuthed,
    async login(email, password) {
      const res = await api.post<Tokens>('/auth/login', { email, password });
      tokenStore.set({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    },
    logout: () => tokenStore.set(null),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
