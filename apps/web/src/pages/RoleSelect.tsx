import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Wrench, Check, ArrowRight } from 'lucide-react';
import type { Role } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';

const CARDS: {
  role: Role;
  title: string;
  blurb: string;
  bullets: string[];
  icon: typeof Leaf;
  iconWrap: string;
}[] = [
  {
    role: 'farmer',
    title: 'Farmer',
    blurb: 'Post jobs and hire agricultural workers',
    bullets: ['Post job listings', 'Find skilled workers', 'Manage your farm jobs', 'Chat with labourers'],
    icon: Leaf,
    iconWrap: 'bg-brand-green/15 text-brand-green',
  },
  {
    role: 'labourer',
    title: 'Labourer',
    blurb: 'Find nearby farm work and earn money',
    bullets: ['Browse nearby jobs', 'Apply with one tap', 'Track your applications', 'Chat with farmers'],
    icon: Wrench,
    iconWrap: 'bg-brand-accent/15 text-brand-accent',
  },
];

export default function RoleSelect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/signin', { replace: true });
    else if (profile) navigate('/app/dashboard', { replace: true });
  }, [user, profile, loading, navigate]);

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <h1 className="text-2xl font-bold text-brand-text">I am a…</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Choose how you want to use AgriJoin. You can switch roles later from your profile settings.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => {
          const on = selected === c.role;
          return (
            <button
              key={c.role}
              onClick={() => setSelected(c.role)}
              className={`aj-card relative p-5 text-left transition-all ${
                on ? 'ring-2 ring-brand-green' : 'hover:shadow-lift'
              }`}
            >
              {on && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-green p-1 text-white">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${c.iconWrap}`}
              >
                <c.icon className="h-6 w-6" />
              </span>
              <h2 className="mt-3 text-lg font-bold text-brand-text">{c.title}</h2>
              <p className="text-sm text-brand-muted">{c.blurb}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-brand-text">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-green" /> {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <button
        className="aj-btn-primary mt-6 w-full"
        disabled={!selected}
        onClick={() => selected && navigate(`/onboarding/${selected}`)}
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
