import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

export interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback = null }: GuardProps) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return fallback;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
}
