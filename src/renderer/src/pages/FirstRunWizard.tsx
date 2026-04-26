import { useState } from 'react';
import type { AppSettings } from '../../../shared/types';
import { I } from '../components/Icons';

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
    if (!rawRoot || !finalRoot) { setError('Both folders are required.'); return; }
    if (rawRoot === finalRoot)  { setError('RAW and FINAL folders must be different.'); return; }
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
    <div className="wizard-wrap">
      <div className="wizard">
        <div className="wizard-mark"><I.Package size={28} /></div>
        <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
          First-run setup
        </div>
        <h2>Welcome to Units Manager</h2>
        <p className="lead">
          Choose where developer customizations live and where prepared units should be written.
          Both can be changed later from Settings.
        </p>

        <div className="field">
          <label className="field-label">RAW customizations folder</label>
          <div className="path-row">
            <input
              value={rawRoot}
              onChange={(e) => setRawRoot(e.target.value)}
              placeholder="e.g. D:\UNITS"
              spellCheck={false}
            />
            <button className="btn" onClick={pickRaw}>
              <I.FolderOpen /> Browse
            </button>
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
            <button className="btn" onClick={pickFinal}>
              <I.FolderOpen /> Browse
            </button>
          </div>
          <div className="field-hint">
            Prepared <code>APP_UNITS</code> / <code>DB_UNITS</code> for each customization will be written here.
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spin"><I.Loader /></span> Saving…</> : <>Save and continue <I.ArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
