import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-brand-text">{title}</h1>
      <div className="mt-4 space-y-2 text-sm text-brand-muted [&_h2]:mt-6 [&_h2]:font-semibold [&_h2]:text-brand-text">
        {children}
      </div>
      <p className="mt-8 text-sm">
        <Link to="/" className="text-brand-green">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information AgriJoin stores and how it is protected. It reflects
        the current early-stage implementation.
      </p>

      <h2>What we store</h2>
      <p>
        Your account email (via Supabase Auth), your profile (name and general location such as
        state, district and village), and — for farmers — farm details, or — for labourers — skills,
        availability and an optional expected wage. Jobs you post and applications you make are also
        stored.
      </p>

      <h2>Your phone number</h2>
      <p>
        A phone number is optional. It is stored separately from your public profile and is{' '}
        <strong>never shown to other users by default</strong>. It becomes visible to a specific
        counterparty only after there is a clear connection between you — an accepted application or
        a shared conversation — through a consent-checked request.
      </p>

      <h2>Location</h2>
      <p>
        Using your device location is always optional and only happens after you grant permission.
        You can enter your location manually instead. The Live Map shows{' '}
        <strong>job locations</strong> (which the farmer chose to publish); it does not plot other
        users' precise personal coordinates. Distances are approximate and are only shown when real
        coordinates exist.
      </p>

      <h2>How your data is protected</h2>
      <p>
        Every table is protected by PostgreSQL Row Level Security. You can only read and modify data
        you own or are explicitly authorised to see (for example, a farmer can see applications to
        their own jobs). These rules are enforced on the server, not just in the app.
      </p>

      <h2>What we don't do</h2>
      <p>
        We do not sell your data, and we do not use third-party advertising or tracking in this
        early version.
      </p>
    </LegalPage>
  );
}
