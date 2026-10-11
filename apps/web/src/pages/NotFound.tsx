import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <Logo />
      <h1 className="mt-8 text-5xl font-extrabold text-brand-green">404</h1>
      <p className="mt-2 text-brand-muted">This page could not be found.</p>
      <Link to="/" className="aj-btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
