import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-brand-text">{title}</h1>
      <div className="prose prose-sm mt-4 max-w-none text-brand-text [&_h2]:mt-6 [&_h2]:font-semibold [&_p]:mt-2 [&_p]:text-brand-muted">
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

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        AgriJoin is an early-stage platform that helps farmers publish agricultural work and helps
        labourers discover opportunities. These terms describe acceptable use of the service.
      </p>
      <h2>Using the service</h2>
      <p>
        You are responsible for the accuracy of the information you post, including job details and
        profile information. You agree not to post misleading, unlawful or harmful content.
      </p>
      <h2>Jobs and applications</h2>
      <p>
        AgriJoin facilitates introductions between farmers and labourers. It does not employ
        labourers, guarantee work, set wages, or act as a party to any agreement reached between
        users. Wage, timing and working conditions are arranged directly between the farmer and the
        labourer.
      </p>
      <h2>No guarantees</h2>
      <p>
        As an early-stage product, the service is provided on an "as is" basis without warranties.
        Features may change as the product develops.
      </p>
      <h2>Accounts</h2>
      <p>You are responsible for keeping your account credentials secure.</p>
    </LegalPage>
  );
}
