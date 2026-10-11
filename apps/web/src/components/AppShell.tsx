import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  Search,
  ClipboardList,
  Map as MapIcon,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const FARMER_NAV: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/jobs/new', label: 'Post Job', icon: PlusCircle },
  { to: '/app/jobs', label: 'Manage Jobs', icon: Briefcase },
  { to: '/app/applications', label: 'Applications', icon: ClipboardList },
  { to: '/app/map', label: 'Map', icon: MapIcon },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/profile', label: 'Profile', icon: User },
];

const LABOURER_NAV: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/browse', label: 'Browse Jobs', icon: Search },
  { to: '/app/applications', label: 'My Applications', icon: ClipboardList },
  { to: '/app/map', label: 'Map', icon: MapIcon },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export function AppShell() {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = role === 'farmer' ? FARMER_NAV : LABOURER_NAV;

  async function handleSignOut() {
    await signOut();
    navigate('/signin');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-light text-brand-deep' : 'text-brand-muted hover:bg-brand-light/60 hover:text-brand-text'
    }`;

  return (
    <div className="min-h-full">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-brand-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/app/dashboard" aria-label="AgriJoin">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.to === '/app/jobs'} className={linkClass}>
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="max-w-[10rem] truncate text-sm text-brand-muted" title={profile?.full_name}>
              {profile?.full_name}
            </span>
            <button className="aj-btn-ghost px-3 py-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>

          <button
            className="rounded-lg border border-brand-border p-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-brand-border bg-white px-4 py-3 lg:hidden">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.to === '/app/jobs'} className={linkClass} onClick={() => setOpen(false)}>
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
            <button className="aj-btn-ghost mt-2 w-full justify-start px-3 py-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-10">
        <Outlet />
      </main>

      {/* Bottom nav for small screens (first five items) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-brand-border bg-white lg:hidden">
        {items.slice(0, 5).map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/app/jobs'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive ? 'text-brand-green' : 'text-brand-muted'
              }`
            }
          >
            <it.icon className="h-5 w-5" />
            {it.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
