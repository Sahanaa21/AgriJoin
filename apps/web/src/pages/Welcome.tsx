import { Link } from 'react-router-dom';
import { MapPin, Users, Navigation, ShieldCheck, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: MapPin, label: 'Find nearby farm jobs' },
  { icon: Users, label: 'Connect with workers' },
  { icon: Navigation, label: 'Live map with distance' },
  { icon: ShieldCheck, label: 'Safe & reliable' },
];

export default function Welcome() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/signin" className="aj-btn-ghost">
            Sign In
          </Link>
          <Link to="/signup" className="aj-btn-primary">
            Create Account
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="aj-badge bg-brand-light text-brand-deep">Agricultural Labour Marketplace</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-brand-text sm:text-5xl">
            Connecting Farmers.
            <br />
            Empowering Labourers.
            <br />
            <span className="text-brand-green">Growing Together.</span>
          </h1>
          <p className="mt-4 max-w-md text-brand-muted">
            AgriJoin helps farmers publish agricultural work and helps labourers discover relevant
            opportunities nearby — organised, transparent and easy to use.
          </p>

          <ul className="mt-6 grid max-w-md grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm shadow-card">
                <f.icon className="h-5 w-5 text-brand-green" />
                {f.label}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="aj-btn-primary">
              Create Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/signin" className="aj-btn-ghost">
              Sign In
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="aj-card max-w-sm overflow-hidden p-6">
            <Logo variant="full" className="mx-auto h-auto w-full max-w-xs" />
            <p className="mt-4 text-center text-sm text-brand-muted">
              An early-stage platform to make agricultural labour coordination simpler and fairer.
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-brand-muted">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-6">
          <span>© {new Date().getFullYear()} AgriJoin</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-brand-text">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-brand-text">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
