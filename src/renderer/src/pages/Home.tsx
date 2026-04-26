import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomizationSummary } from '../../../shared/types';
import { I } from '../components/Icons';

export function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'final' | 'pending'>('all');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await window.api.listCustomizations();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customizations');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    if (!items) return null;
    return items.filter((c) => {
      if (filter === 'final' && !c.hasFinal) return false;
      if (filter === 'pending' && c.hasFinal) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, query]);

  if (items === null && !error) {
    return (
      <div className="page">
        <div className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="spin"><I.Loader /></span> Scanning RAW folder…
        </div>
      </div>
    );
  }

  const finalCount = items?.filter((c) => c.hasFinal).length ?? 0;
  const pendingCount = (items?.length ?? 0) - finalCount;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow left">Workspace</div>
          <h1 className="page-title">Customizations</h1>
          <p className="page-subtitle">
            {items?.length ?? 0} found in RAW &middot; {finalCount} prepared &middot; {pendingCount} pending
          </p>
        </div>
        <div className="btn-row">
          <div className="searchbar">
            <I.Search />
            <input
              className="input"
              placeholder="Search customizations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
          </div>
          <button className="btn" onClick={refresh} title="Rescan RAW folder">
            <I.RefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        <div className="toggle-group">
          {(['all', 'final', 'pending'] as const).map((k) => (
            <button
              key={k}
              className={filter === k ? 'active' : ''}
              onClick={() => setFilter(k)}
            >
              {k === 'all' ? 'All' : k === 'final' ? 'Prepared' : 'Pending'}
              <span className="badge" style={{ marginLeft: 4, padding: '0 7px' }}>
                {k === 'all' ? items?.length ?? 0 : k === 'final' ? finalCount : pendingCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {filtered && filtered.length === 0 && (
        <EmptyState
          title={query || filter !== 'all' ? 'No matches' : 'No customizations yet'}
          body={
            query || filter !== 'all'
              ? 'Try clearing the search or filter.'
              : 'Drop a customization folder into your RAW root (each folder is one customization) and click Refresh.'
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <div className="customization-grid">
          {filtered.map((c) => (
            <article
              key={c.name}
              className="cust-card"
              onClick={() => navigate(`/customization/${encodeURIComponent(c.name)}`)}
            >
              <div className="cust-card-head">
                <h3 className="cust-card-name">{c.name}</h3>
                <span className="dot alive" title="Active" />
              </div>
              <div className="cust-card-meta">
                <span className="badge">
                  <I.GitBranch size={11} />
                  {c.changeCount} {c.changeCount === 1 ? 'change' : 'changes'}
                </span>
                {c.hasFinal ? (
                  <span className="badge badge-emerald"><I.CheckCircle size={11} /> Prepared</span>
                ) : (
                  <span className="badge badge-warn"><I.AlertTriangle size={11} /> Pending</span>
                )}
              </div>
              {c.changes.length > 0 && (
                <div className="cust-card-changes">
                  {c.changes.slice(0, 6).map((ch) => (
                    <span key={ch} className="chg-pill">{ch}</span>
                  ))}
                  {c.changes.length > 6 && <span className="chg-pill">+{c.changes.length - 6}</span>}
                </div>
              )}
              <div className="cust-card-foot">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.api.openInExplorer(c.rawPath);
                  }}
                >
                  <I.FolderOpen size={12} /> Open folder
                </button>
                <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open <I.ArrowRight size={12} />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="icon"><I.Package /></div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
