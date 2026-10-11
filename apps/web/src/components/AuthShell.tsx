import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

/** Shared frame for Sign In / Create Account, mirroring the app references. */
export function AuthShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const tab = (to: string, label: string) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
          active ? 'bg-white text-brand-deep shadow-card' : 'text-brand-muted'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-full">
      <div className="relative h-40 bg-gradient-to-br from-brand-green to-brand-deep">
        <Link to="/" className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium">
          ← Back
        </Link>
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
          <Logo className="text-white [&_span]:text-white" />
          <p className="mt-1 text-sm text-white/90">Agricultural Labour Marketplace</p>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-md px-4 pb-16">
        <div className="aj-card p-6">
          <div className="mb-5 flex gap-1 rounded-xl bg-brand-light p-1">
            {tab('/signin', 'Sign In')}
            {tab('/signup', 'Create Account')}
          </div>
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-brand-muted">
          By continuing you agree to AgriJoin's{' '}
          <Link to="/terms" className="underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
