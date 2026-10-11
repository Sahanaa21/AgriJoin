import { Link } from 'react-router-dom';

/**
 * AgriJoin brand mark. By default it shows the official logo image
 * (apps/web/public/agrijoin-logo.webp). `variant="wordmark"` renders a
 * compact text lockup for tight spaces (navbars) so the detailed logo and
 * a heading never overlap — one of the usability fixes from the references.
 */
export function Logo({
  variant = 'wordmark',
  className = '',
  withText = true,
}: {
  variant?: 'full' | 'wordmark';
  className?: string;
  withText?: boolean;
}) {
  if (variant === 'full') {
    return (
      <img
        src="/agrijoin-logo.webp"
        alt="AgriJoin"
        className={className || 'h-28 w-auto'}
      />
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <img src="/agrijoin-logo.png" alt="" aria-hidden className="h-8 w-8 rounded-md object-cover" />
      {withText && (
        <span className="text-xl">
          <span className="text-brand-deep">Agri</span>
          <span className="text-brand-accent">Join</span>
        </span>
      )}
    </span>
  );
}

export function LogoLink({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} aria-label="AgriJoin home">
      <Logo />
    </Link>
  );
}
