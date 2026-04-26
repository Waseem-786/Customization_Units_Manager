import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { FirstRunWizard } from './pages/FirstRunWizard';
import { CustomizationDetail } from './pages/CustomizationDetail';
import type { AppSettings } from '../../shared/types';
import { I } from './components/Icons';

type Theme = 'dark' | 'light';
type Density = 'compact' | 'comfortable';
type Nav = 'sidebar' | 'top';

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v as T) || fallback;
  } catch { return fallback; }
}

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme]     = useState<Theme>(()    => readPref('cum.theme',   'dark'));
  const [density, setDensity] = useState<Density>(()  => readPref('cum.density', 'compact'));
  const [nav, setNav]         = useState<Nav>(()      => readPref('cum.nav',     'sidebar'));

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-density', density);
    localStorage.setItem('cum.theme', theme);
    localStorage.setItem('cum.density', density);
    localStorage.setItem('cum.nav', nav);
  }, [theme, density, nav]);

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <BackgroundCanvas />
        <div className="page" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
          <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="spin"><I.Loader /></span>
            <span>Loading…</span>
          </div>
        </div>
      </>
    );
  }

  const isConfigured = !!(settings?.rawRoot && settings?.finalRoot);

  if (!isConfigured) {
    return (
      <>
        <BackgroundCanvas />
        <Routes>
          <Route path="/setup" element={<FirstRunWizard onSaved={setSettings} />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <BackgroundCanvas />
      <div className="app-shell" data-nav={nav}>
        {nav === 'sidebar' && <Sidebar />}

        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <I.Package size={16} />
            </span>
            <span>Units Manager</span>
            <span className="brand-sub">Customization workflow</span>
          </div>

          {nav === 'top' && (
            <nav className="topbar-nav" aria-label="Primary">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                <I.Home size={14} /> Home
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                <I.Settings size={14} /> Settings
              </NavLink>
            </nav>
          )}

          <div className="topbar-spacer" />

          <div className="topbar-tools">
            <ToggleGroup<Nav>
              value={nav} onChange={setNav}
              options={[
                { value: 'sidebar', icon: <I.PanelLeft />, title: 'Sidebar nav' },
                { value: 'top',     icon: <I.Layout />,    title: 'Top nav'     }
              ]}
            />
            <ToggleGroup<Density>
              value={density} onChange={setDensity}
              options={[
                { value: 'compact',     label: 'Compact' },
                { value: 'comfortable', label: 'Cozy' }
              ]}
            />
            <ToggleGroup<Theme>
              value={theme} onChange={setTheme}
              options={[
                { value: 'dark',  icon: <I.Moon />, title: 'Dark candlelight' },
                { value: 'light', icon: <I.Sun />,  title: 'Light parchment'  }
              ]}
            />
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/customization/:name" element={<CustomizationDetail />} />
            <Route path="/settings" element={<Settings settings={settings!} onSaved={setSettings} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="section-label">Workspace</div>
      <NavLink to="/" end className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
        <I.Home /> Customizations
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
        <I.Settings /> Settings
      </NavLink>

      <div className="section-label">Reference</div>
      <a className="side-link" href="#" onClick={(e) => e.preventDefault()}>
        <I.Tree /> Workflow guide
      </a>
      <a className="side-link" href="#" onClick={(e) => e.preventDefault()}>
        <I.Sparkles /> What&rsquo;s new
      </a>

      <div className="side-foot">
        <span className="dot alive" />
        <span>v0.1.0 — ready</span>
      </div>
    </aside>
  );
}

function BackgroundCanvas() {
  return (
    <div className="bg-canvas" aria-hidden="true">
      <div className="bg-dots" />
      <div className="bg-halo h1" />
      <div className="bg-halo h2" />
    </div>
  );
}

interface ToggleOpt<T> { value: T; label?: string; icon?: React.ReactNode; title?: string; }
function ToggleGroup<T extends string>({
  value, onChange, options
}: { value: T; onChange: (v: T) => void; options: ToggleOpt<T>[] }) {
  return (
    <div className="toggle-group" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          title={o.title ?? o.label}
        >
          {o.icon}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
