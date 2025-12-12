import type { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';

export function LayoutShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (isHome) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="container site-header-inner">
          <div className="wordmark">
            <span>Photo</span>
            <span>LineArt</span>
          </div>
          <nav className="site-nav">
            <a className="site-nav-link" href="/">
              Home
            </a>
            <a className="site-nav-link" href="/studio#studio-console">
              Upload photos
            </a>
            <a className="site-nav-link" href="/studio#print-tips">
              Printing tips
            </a>
            <a className="site-nav-link" href="/about">
              About
            </a>
            <a className="site-nav-link" href="/privacy">
              Privacy
            </a>
            <a className="site-nav-link" href="/terms">
              Terms
            </a>
            <a className="site-nav-link" href="/contact">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="container">
          <nav className="footer-nav">
            <a href="/about">About</a>
            <span>|</span>
            <a href="#how-it-works">How it works</a>
            <span>|</span>
            <a href="/privacy">Privacy</a>
            <span>|</span>
            <a href="/terms">Terms</a>
            <span>|</span>
            <a href="/contact">Contact</a>
            <span>|</span>
            <a href="https://buymeacoffee.com/photolineart" target="_blank" rel="noreferrer">
              Buy us a coffee
            </a>
          </nav>
          <p className="footer-note">
            PhotoLineArt uses AI to help create line art and color guides from your photos. We treat your images and personal data with care. See our Privacy Policy
            for the details.
          </p>
        </div>
      </footer>
    </div>
  );
}
