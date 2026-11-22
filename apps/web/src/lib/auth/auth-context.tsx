'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
} from './api';
import type { User } from './types';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const response = await getCurrentUser();
        if (active) setUser(response.user);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          if (active) setUser(null);
          return;
        }
        try {
          const response = await refreshSession();
          if (active) setUser(response.user);
        } catch {
          if (active) setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const response = await loginRequest(input);
    setUser(response.user);
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const response = await registerRequest(input);
      setUser(response.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
