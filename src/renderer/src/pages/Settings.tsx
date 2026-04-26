import { useState } from 'react';
import type { AppSettings } from '../../../shared/types';
import { I } from '../components/Icons';

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
    setError(null); setSaved(false);
    if (!rawRoot || !finalRoot) { setError('Both folders are required.'); return; }
    if (rawRoot === finalRoot)  { setError('RAW and FINAL folders must be different.'); return; }
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
      <div className="page-head">
        <div>
          <div className="eyebrow left">Configuration</div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Update where customizations are read from and written to.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <div className="field">
          <label className="field-label">
            <I.FolderOpen size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            RAW customizations folder
          </label>
          <div className="path-row">
            <input value={rawRoot} onChange={(e) => setRawRoot(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={() => pick(setRawRoot, 'Select RAW customizations folder')}>
              <I.FolderOpen /> Browse
            </button>
          </div>
          <div className="field-hint">Each subfolder here is one customization.</div>
        </div>

        <div className="field">
          <label className="field-label">
            <I.Package size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            FINAL units folder
          </label>
          <div className="path-row">
            <input value={finalRoot} onChange={(e) => setFinalRoot(e.target.value)} spellCheck={false} />
            <button className="btn" onClick={() => pick(setFinalRoot, 'Select FINAL units folder')}>
              <I.FolderOpen /> Browse
            </button>
          </div>
          <div className="field-hint">Prepared APP_UNITS / DB_UNITS bundles will be written here.</div>
        </div>

        {error && <div className="error">{error}</div>}
        {saved && <div className="success"><I.CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Saved.</div>}

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spin"><I.Loader /></span> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
