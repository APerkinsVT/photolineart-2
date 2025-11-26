import { Route, Routes } from 'react-router-dom';
import { LayoutShell } from './components/LayoutShell';
import { NotFoundPage } from './routes/NotFoundPage';
import { PortalPage } from './routes/PortalPage';
import { LandingPage } from './routes/LandingPage';
import { StudioPage } from './routes/StudioPage';

function App() {
  return (
    <LayoutShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/p/:portalId" element={<PortalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutShell>
  );
}

export default App;
