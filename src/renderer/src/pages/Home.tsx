import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomizationSummary } from '../../../shared/types';

export function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await window.api.listCustomizations();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customizations');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (items === null && !error) {
    return <div className="page"><p>Scanning…</p></div>;
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 className="page-title">Customizations</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {items?.length ?? 0} found in RAW folder
          </p>
        </div>
        <button onClick={refresh}>Refresh</button>
      </div>

      {error && <div className="error">{error}</div>}

      {items && items.length === 0 && (
        <div className="empty-state">
          <h2>No customizations yet</h2>
          <p>
            Drop a customization folder into your RAW root (each folder is one customization) and click Refresh.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="customization-grid">
          {items.map((c) => (
            <div
              key={c.name}
              className="customization-card"
              onClick={() => navigate(`/customization/${encodeURIComponent(c.name)}`)}
            >
              <h3>{c.name}</h3>
              <div className="meta">
                <span className="badge">{c.changeCount} {c.changeCount === 1 ? 'change' : 'changes'}</span>
                {c.hasFinal && <span className="badge ok">Final exists</span>}
              </div>
              {c.changes.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {c.changes.join(', ')}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button
                  className="link-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.api.openInExplorer(c.rawPath);
                  }}
                >
                  Open in Explorer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
