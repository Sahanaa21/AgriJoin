import { Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';

import Welcome from './pages/Welcome';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import RoleSelect from './pages/RoleSelect';
import ProfileSetup from './pages/ProfileSetup';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Dashboard from './pages/Dashboard';
import PostJob from './pages/PostJob';
import ManageJobs from './pages/ManageJobs';
import BrowseJobs from './pages/BrowseJobs';
import JobDetails from './pages/JobDetails';
import Applications from './pages/Applications';
import LiveMap from './pages/LiveMap';
import Messages from './pages/Messages';
import ProfilePage from './pages/ProfilePage';
import NotFound from './pages/NotFound';

function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and set{' '}
      <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
    </div>
  );
}

export default function App() {
  return (
    <>
      <ConfigBanner />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/onboarding/:role" element={<ProfileSetup />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs/new" element={<PostJob />} />
          <Route path="jobs/:id/edit" element={<PostJob />} />
          <Route path="jobs" element={<ManageJobs />} />
          <Route path="jobs/:id" element={<JobDetails />} />
          <Route path="browse" element={<BrowseJobs />} />
          <Route path="applications" element={<Applications />} />
          <Route path="map" element={<LiveMap />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:conversationId" element={<Messages />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
