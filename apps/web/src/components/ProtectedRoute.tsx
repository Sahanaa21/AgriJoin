import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/**
 * Guards the authenticated area. Note: this is a UX guard only — the real
 * authorization is enforced by Supabase Row Level Security on every query,
 * so a user who bypasses the client still cannot read/write others' data.
 */
export function ProtectedRoute({ children, requireRole }: { children: ReactNode; requireRole?: Role }) {
  const { loading, user, profile } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Loading…" />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;

  // Signed in but no profile yet → finish onboarding.
  if (!profile) return <Navigate to="/role" replace />;

  if (requireRole && profile.role !== requireRole) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}
