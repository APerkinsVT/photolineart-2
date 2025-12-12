import { Route, Routes } from 'react-router-dom';
import { StaticLanding } from './components/StaticLanding';
import { LayoutShell } from './components/LayoutShell';
import { NotFoundPage } from './routes/NotFoundPage';
import { PortalPage } from './routes/PortalPage';
import { LandingPage } from './routes/LandingPage';
import { StudioPage } from './routes/StudioPage';
import { AboutPage } from './routes/AboutPage';
import { PrivacyPage } from './routes/PrivacyPage';
import { TermsPage } from './routes/TermsPage';
import { ContactPage } from './routes/ContactPage';

function App() {
  return (
    <LayoutShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
          {/* New: static design preview route */}
        <Route path="/static-landing" element={<StaticLanding />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/p/:portalId" element={<PortalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutShell>
  );
}

export default App;
