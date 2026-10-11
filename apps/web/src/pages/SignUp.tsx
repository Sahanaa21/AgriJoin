import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { signUpSchema, type SignUpInput } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { Alert } from '../components/ui';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: 'labourer' },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    try {
      const { needsConfirmation } = await signUp(values.email, values.password, values.full_name);
      // Stash the intended role + name for the onboarding step.
      sessionStorage.setItem('aj_pending_name', values.full_name);
      if (values.phone) sessionStorage.setItem('aj_pending_phone', values.phone);
      if (needsConfirmation) {
        setInfo(
          'Account created. Please confirm your email, then sign in. (For local demos, disable email confirmation in Supabase Auth settings.)',
        );
        return;
      }
      navigate('/role', { replace: true });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Sign up failed');
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-brand-text">Join AgriJoin</h1>
      <p className="mt-1 text-sm text-brand-muted">Create an account to find farm work or workers.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}

        <div>
          <label className="aj-label" htmlFor="full_name">
            Full name
          </label>
          <input id="full_name" className="aj-input" placeholder="Enter your full name" {...register('full_name')} />
          {errors.full_name && <p className="aj-error">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="aj-label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" className="aj-input" {...register('email')} />
          {errors.email && <p className="aj-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="aj-label" htmlFor="phone">
            Mobile number <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input id="phone" inputMode="tel" className="aj-input" placeholder="+91 99999 99999" {...register('phone')} />
          {errors.phone && <p className="aj-error">{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="aj-label" htmlFor="password">
              Password
            </label>
            <input id="password" type="password" autoComplete="new-password" className="aj-input" {...register('password')} />
            {errors.password && <p className="aj-error">{errors.password.message}</p>}
          </div>
          <div>
            <label className="aj-label" htmlFor="confirm_password">
              Confirm
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className="aj-input"
              {...register('confirm_password')}
            />
            {errors.confirm_password && <p className="aj-error">{errors.confirm_password.message}</p>}
          </div>
        </div>

        <button type="submit" className="aj-btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Continue'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-brand-muted">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-brand-green">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
