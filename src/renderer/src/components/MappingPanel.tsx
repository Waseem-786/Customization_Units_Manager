import { useEffect, useState } from 'react';
import type { FolderRole, MappingConfig } from '../../../shared/types';

interface Props {
  customizationName: string;
  detectedFolders: string[];
  initial: MappingConfig;
  mappingExists: boolean;
  onSaved: (mapping: MappingConfig) => void;
}

const ROLES: FolderRole[] = ['APP_UNITS', 'DB_UNITS', 'IGNORE'];
const ROLE_LABEL: Record<FolderRole, string> = {
  APP_UNITS: 'APP_UNITS',
  DB_UNITS: 'DB_UNITS',
  IGNORE: 'Ignore'
};

export function MappingPanel({ customizationName, detectedFolders, initial, mappingExists, onSaved }: Props) {
  const [folders, setFolders] = useState<Record<string, FolderRole>>(initial.folders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFolders(initial.folders);
    setDirty(!mappingExists);
  }, [initial, mappingExists]);

  function setRole(folder: string, role: FolderRole) {
    setFolders((prev) => ({ ...prev, [folder]: role }));
    setDirty(true);
    setSavedAt(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const config: MappingConfig = { version: 1, folders };
      const result = await window.api.saveMapping(customizationName, config);
      onSaved(result);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  }

  if (detectedFolders.length === 0) {
    return null;
  }

  return (
    <div className="card mapping-panel">
      <div className="mapping-header">
        <h3>Folder mapping</h3>
        <span className="muted" style={{ fontSize: 12 }}>
          {mappingExists ? 'Saved in .units-manager.json' : 'Not saved yet — defaults shown'}
        </span>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 12 }}>
        For each folder produced by the developer, choose where its files go when preparing final units.
      </p>

      <table className="mapping-table">
        <thead>
          <tr>
            <th>Folder</th>
            <th>Destination</th>
          </tr>
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
                        {ROLE_LABEL[r]}
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

      <div className="btn-row">
        <button className="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving
            ? 'Saving…'
            : !dirty
              ? 'Saved'
              : mappingExists
                ? 'Save mapping'
                : 'Save defaults to .units-manager.json'}
        </button>
      </div>
    </div>
  );
}
