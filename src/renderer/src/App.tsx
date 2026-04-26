import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { FirstRunWizard } from './pages/FirstRunWizard';
import { CustomizationDetail } from './pages/CustomizationDetail';
import type { AppSettings } from '../../shared/types';

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="page"><p>Loading…</p></div>;
  }

  const isConfigured = !!(settings?.rawRoot && settings?.finalRoot);

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Customization Units Manager</h1>
        {isConfigured && (
          <nav>
            <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Home
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Settings
            </NavLink>
          </nav>
        )}
      </header>

      <Routes>
        {!isConfigured && (
          <>
            <Route path="/setup" element={<FirstRunWizard onSaved={setSettings} />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        )}
        {isConfigured && (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/customization/:name" element={<CustomizationDetail />} />
            <Route path="/settings" element={<Settings settings={settings!} onSaved={setSettings} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
