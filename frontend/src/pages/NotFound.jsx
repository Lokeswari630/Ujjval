import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const NotFound = () => {
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);

  const primaryLink = isAuthenticated ? '/dashboard' : '/auth';
  const primaryLabel = isAuthenticated ? 'Go to dashboard' : 'Go to login';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hospital-bg-overlay" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(16,34,53,0.14)] backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">404</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Page not found</h1>
            <p className="mt-3 text-base text-slate-600">
              The page at <span className="font-medium text-slate-800">{location.pathname}</span> does not exist.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to={primaryLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700"
            >
              <Home className="h-4 w-4" />
              {primaryLabel}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
