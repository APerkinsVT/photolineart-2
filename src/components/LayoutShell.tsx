import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function LayoutShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (isHome) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-xl font-semibold text-brand">
            PhotoLineArt
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-brand">
              Home
            </Link>
            <Link to="/studio" className="text-brand font-semibold">
              Studio
            </Link>
            <Link to="/p/demo" className="hover:text-brand">
              Portal demo
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="px-4 py-10 sm:px-6">{children}</div>
      </main>
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-2 px-4 py-6 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} photolineart.com</span>
          <span className="text-xs text-slate-400">
            Dev stack: Vite + React + Tailwind + Vercel Functions
          </span>
        </div>
      </footer>
    </div>
  );
}
