import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '../api/endpoints';
import { ApiError } from '../api/errors';
import { apiRequest, fetchSession } from '../api/client';
import type { AuthSession, UserProfile } from '../types/user';
import { LOCAL_STORAGE_PREFIX } from '../constants/app';

interface AuthContextValue {
  user: UserProfile | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = `${LOCAL_STORAGE_PREFIX}:session`;

function loadStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadStoredSession);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = (nextSession: AuthSession | null) => {
    setSession(nextSession);
    storeSession(nextSession);
  };

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const stored = loadStoredSession();
      if (!stored) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const fresh = await fetchSession(stored.accessToken);
        if (mounted) {
          syncSession({ ...stored, user: fresh.user });
        }
      } catch {
        if (mounted) syncSession(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (accessToken: string, refreshToken?: string) => {
    const nextSession = await fetchSession(accessToken);
    syncSession({
      accessToken,
      refreshToken,
      expiresAt: nextSession.expiresAt,
      user: nextSession.user,
    });
  };

  const logout = async () => {
    try {
      if (session?.accessToken) {
        await apiRequest(ENDPOINTS.auth.logout, {
          method: 'POST',
          authToken: session.accessToken,
        });
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
    } finally {
      syncSession(null);
    }
  };

  const refreshSession = async () => {
    if (!session?.accessToken) return;
    const fresh = await fetchSession(session.accessToken);
    syncSession({ ...session, user: fresh.user, expiresAt: fresh.expiresAt });
  };

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    isAuthenticated: Boolean(session?.accessToken),
    isLoading,
    login,
    logout,
    refreshSession,
  }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
