import { useState } from 'react';
import type { AppSettings } from '../../../shared/types';

interface Props {
  settings: AppSettings;
  onSaved: (settings: AppSettings) => void;
}

export function Settings({ settings, onSaved }: Props) {
  const [rawRoot, setRawRoot] = useState<string>(settings.rawRoot ?? '');
  const [finalRoot, setFinalRoot] = useState<string>(settings.finalRoot ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(setter: (v: string) => void, title: string) {
    const p = await window.api.pickFolder(title);
    if (p) setter(p);
  }

  async function save() {
    setError(null);
    setSaved(false);
    if (!rawRoot || !finalRoot) {
      setError('Both folders are required.');
      return;
    }
    if (rawRoot === finalRoot) {
      setError('RAW and FINAL folders must be different.');
      return;
    }
    setSaving(true);
    try {
      const result = await window.api.saveSettings({ rawRoot, finalRoot });
      onSaved(result);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>
      <p className="page-subtitle">Update where customizations are read from and written to.</p>

      <div className="card" style={{ maxWidth: 720 }}>
        <div className="field">
          <label className="field-label">RAW customizations folder</label>
          <div className="path-row">
            <input value={rawRoot} onChange={(e) => setRawRoot(e.target.value)} spellCheck={false} />
            <button onClick={() => pick(setRawRoot, 'Select RAW customizations folder')}>Browse…</button>
          </div>
        </div>

        <div className="field">
          <label className="field-label">FINAL units folder</label>
          <div className="path-row">
            <input value={finalRoot} onChange={(e) => setFinalRoot(e.target.value)} spellCheck={false} />
            <button onClick={() => pick(setFinalRoot, 'Select FINAL units folder')}>Browse…</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {saved && <div className="success">Saved.</div>}

        <div className="btn-row">
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
