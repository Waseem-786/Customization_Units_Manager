import { useState } from 'react';
import type { AppSettings } from '../../../shared/types';

interface Props {
  onSaved: (settings: AppSettings) => void;
}

export function FirstRunWizard({ onSaved }: Props) {
  const [rawRoot, setRawRoot] = useState<string>('');
  const [finalRoot, setFinalRoot] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickRaw() {
    const p = await window.api.pickFolder('Select RAW customizations folder');
    if (p) setRawRoot(p);
  }

  async function pickFinal() {
    const p = await window.api.pickFolder('Select FINAL units folder');
    if (p) setFinalRoot(p);
  }

  async function save() {
    setError(null);
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
      const saved = await window.api.saveSettings({ rawRoot, finalRoot });
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="wizard">
        <h2>Welcome — let&rsquo;s set up your folders</h2>
        <p className="page-subtitle">
          Pick where developer-supplied customizations live (RAW) and where the prepared final units should be written.
        </p>

        <div className="card">
          <div className="field">
            <label className="field-label">RAW customizations folder</label>
            <div className="path-row">
              <input
                value={rawRoot}
                onChange={(e) => setRawRoot(e.target.value)}
                placeholder="e.g. D:\UNITS"
                spellCheck={false}
              />
              <button onClick={pickRaw}>Browse…</button>
            </div>
            <div className="field-hint">
              Each subfolder here is one customization (e.g. <code>CUSTOMIZATION__2025_0497</code>).
            </div>
          </div>

          <div className="field">
            <label className="field-label">FINAL units folder</label>
            <div className="path-row">
              <input
                value={finalRoot}
                onChange={(e) => setFinalRoot(e.target.value)}
                placeholder="e.g. D:\FINAL_UNITS"
                spellCheck={false}
              />
              <button onClick={pickFinal}>Browse…</button>
            </div>
            <div className="field-hint">
              Prepared APP_UNITS / DB_UNITS for each customization will be written here under the same customization name.
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="btn-row">
            <button className="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save and continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
