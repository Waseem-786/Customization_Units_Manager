import { useEffect, useState } from 'react';
import type { FolderRole, MappingConfig } from '../../../shared/types';
import { I } from './Icons';

interface Props {
  customizationName: string;
  detectedFolders: string[];
  initial: MappingConfig;
  mappingExists: boolean;
  onSaved: (mapping: MappingConfig) => void;
}

const ROLES: FolderRole[] = ['APP_UNITS', 'DB_UNITS', 'IGNORE'];
const ROLE_LABEL: Record<FolderRole, string> = { APP_UNITS: 'App', DB_UNITS: 'DB', IGNORE: 'Ignore' };
const ROLE_ICON: Record<FolderRole, JSX.Element> = {
  APP_UNITS: <I.Code size={11} />,
  DB_UNITS:  <I.Database size={11} />,
  IGNORE:    <I.EyeOff size={11} />
};

export function MappingPanel({ customizationName, detectedFolders, initial, mappingExists, onSaved }: Props) {
  const [folders, setFolders] = useState<Record<string, FolderRole>>(initial.folders);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty]     = useState(false);

  useEffect(() => {
    setFolders(initial.folders);
    setDirty(!mappingExists);
  }, [initial, mappingExists]);

  function setRole(folder: string, role: FolderRole) {
    setFolders((prev) => ({ ...prev, [folder]: role }));
    setDirty(true); setSavedAt(null);
  }

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const config: MappingConfig = { version: 1, folders };
      const result = await window.api.saveMapping(customizationName, config);
      onSaved(result); setDirty(false); setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save mapping');
    } finally { setSaving(false); }
  }

  if (detectedFolders.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <I.Layers size={14} style={{ color: 'var(--gold)' }} />
        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>
          Folder mapping
        </h3>
        {mappingExists
          ? <span className="badge badge-emerald" style={{ marginLeft: 'auto' }}>
              <I.CheckCircle size={11} /> saved
            </span>
          : <span className="badge badge-warn" style={{ marginLeft: 'auto' }}>defaults</span>}
      </div>
      <p className="muted" style={{ fontSize: 'var(--fs-tiny)', margin: '0 0 6px' }}>
        Choose where each developer-supplied folder ends up when preparing final units.
      </p>

      <table className="mapping-table">
        <thead>
          <tr><th>Folder</th><th>Destination</th></tr>
        </thead>
        <tbody>
          {detectedFolders.map((folder) => {
            const current = folders[folder] ?? 'IGNORE';
            return (
              <tr key={folder}>
                <td className="folder-name">{folder}</td>
                <td>
                  <div className="role-toggle">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        className={'role-btn role-' + r.toLowerCase() + (current === r ? ' active' : '')}
                        onClick={() => setRole(folder, r)}
                      >
                        {ROLE_ICON[r]} {ROLE_LABEL[r]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {error && <div className="error">{error}</div>}
      {savedAt && !dirty && <div className="success">Mapping saved.</div>}

      <div className="btn-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <><span className="spin"><I.Loader size={12} /></span> Saving…</> : !dirty ? 'Saved' : 'Save mapping'}
        </button>
      </div>
    </div>
  );
}
