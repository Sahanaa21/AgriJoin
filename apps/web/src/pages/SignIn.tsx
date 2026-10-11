import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { signInSchema, type SignInInput } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { Alert } from '../components/ui';

export default function SignIn() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  // Redirect once authenticated.
  useEffect(() => {
    if (loading || !user) return;
    navigate(profile ? '/app/dashboard' : '/role', { replace: true });
  }, [user, profile, loading, navigate]);

  async function onSubmit(values: SignInInput) {
    setServerError(null);
    try {
      await signIn(values.email, values.password);
      // onAuthStateChange + the effect above handle navigation.
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Sign in failed');
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-brand-text">Welcome back</h1>
      <p className="mt-1 text-sm text-brand-muted">Sign in with your email and password.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}

        <div>
          <label className="aj-label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" className="aj-input" {...register('email')} />
          {errors.email && <p className="aj-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="aj-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="aj-input"
            {...register('password')}
          />
          {errors.password && <p className="aj-error">{errors.password.message}</p>}
        </div>

        <button type="submit" className="aj-btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-brand-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand-green">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
