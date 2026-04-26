import { useEffect, useMemo, useState } from 'react';
import type { DetectedItem, MappingConfig, MappingEntry } from '../../../shared/types';
import { IGNORE_DESTINATION } from '../../../shared/types';
import { I } from './Icons';

interface Props {
  customizationName: string;
  detectedItems: DetectedItem[];
  initial: MappingConfig;
  mappingExists: boolean;
  unmappedItems: string[];
  onSaved: (mapping: MappingConfig) => void;
}

const NEW_BUCKET_SENTINEL = '__add-new-bucket__';

export function MappingPanel({
  customizationName,
  detectedItems,
  initial,
  mappingExists,
  unmappedItems,
  onSaved
}: Props) {
  const [buckets, setBuckets] = useState<string[]>(initial.buckets);
  const [entries, setEntries] = useState<Record<string, MappingEntry>>(initial.entries);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const [newBucketName, setNewBucketName] = useState<string>('');
  const [pendingNewFor, setPendingNewFor] = useState<string | null>(null);

  useEffect(() => {
    setBuckets(initial.buckets);
    setEntries(initial.entries);
    setDirty(!mappingExists || unmappedItems.length > 0);
    setSavedAt(null);
  }, [initial, mappingExists, unmappedItems]);

  const initialUnmapped = useMemo(() => new Set(unmappedItems), [unmappedItems]);

  function setDestination(itemName: string, kind: DetectedItem['kind'], dest: string) {
    setEntries((prev) => ({ ...prev, [itemName]: { kind, destination: dest } }));
    setDirty(true);
    setSavedAt(null);
  }

  function handleSelectChange(item: DetectedItem, value: string) {
    if (value === NEW_BUCKET_SENTINEL) {
      setPendingNewFor(item.name);
      setNewBucketName('');
      return;
    }
    setDestination(item.name, item.kind, value);
  }

  function commitNewBucket(item: DetectedItem) {
    const name = newBucketName.trim();
    if (!name) {
      setPendingNewFor(null);
      return;
    }
    if (name.toUpperCase() === IGNORE_DESTINATION) {
      setError(`"IGNORE" is reserved.`);
      return;
    }
    if (!buckets.includes(name)) setBuckets((prev) => [...prev, name]);
    setDestination(item.name, item.kind, name);
    setPendingNewFor(null);
    setNewBucketName('');
    setError(null);
  }

  function removeBucket(bucketName: string) {
    const inUse = Object.values(entries).some((e) => e.destination === bucketName);
    if (inUse) {
      setError(
        `Cannot remove "${bucketName}" — at least one item is mapped to it. Re-map those items first.`
      );
      return;
    }
    setBuckets((prev) => prev.filter((b) => b !== bucketName));
    setDirty(true);
    setError(null);
  }

  function addBucketFromHeader() {
    const name = newBucketName.trim();
    if (!name) return;
    if (name.toUpperCase() === IGNORE_DESTINATION) {
      setError(`"IGNORE" is reserved.`);
      return;
    }
    if (buckets.includes(name)) {
      setError(`"${name}" already exists.`);
      return;
    }
    setBuckets((prev) => [...prev, name]);
    setNewBucketName('');
    setDirty(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const config: MappingConfig = { version: 2, buckets, entries };
      const result = await window.api.saveMapping(customizationName, config);
      onSaved(result);
      setBuckets(result.buckets);
      setEntries(result.entries);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  }

  if (detectedItems.length === 0) return null;

  const unsavedNewItems = detectedItems.filter((i) => initialUnmapped.has(i.name));

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <I.Layers size={14} style={{ color: 'var(--gold)' }} />
        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>
          Folder mapping
        </h3>
        {!mappingExists ? (
          <span className="badge badge-warn" style={{ marginLeft: 'auto' }}>
            <I.AlertTriangle size={11} /> not saved
          </span>
        ) : unsavedNewItems.length > 0 ? (
          <span className="badge badge-warn" style={{ marginLeft: 'auto' }}>
            <I.AlertTriangle size={11} /> {unsavedNewItems.length} unmapped
          </span>
        ) : (
          <span className="badge badge-emerald" style={{ marginLeft: 'auto' }}>
            <I.CheckCircle size={11} /> saved
          </span>
        )}
      </div>
      <p className="muted" style={{ fontSize: 'var(--fs-tiny)', margin: '0 0 10px' }}>
        Decide where each detected folder or loose file ends up when preparing final units.
        Mapping must be saved before a Prepare can run.
      </p>

      {/* Bucket management */}
      <div className="bucket-bar">
        <span className="muted" style={{ fontSize: 'var(--fs-tiny)' }}>Destinations:</span>
        {buckets.map((b) => (
          <span key={b} className="bucket-chip">
            {b}
            <button
              type="button"
              className="bucket-chip-x"
              title={`Remove ${b}`}
              aria-label={`Remove ${b}`}
              onClick={() => removeBucket(b)}
            >
              <I.X size={10} />
            </button>
          </span>
        ))}
        <span className="bucket-add">
          <input
            type="text"
            placeholder="Add destination…"
            value={pendingNewFor ? '' : newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addBucketFromHeader();
            }}
            disabled={!!pendingNewFor}
            spellCheck={false}
          />
          <button type="button" className="btn btn-sm" onClick={addBucketFromHeader}>
            <I.Plus size={12} /> Add
          </button>
        </span>
      </div>

      <table className="mapping-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="dest-col-head">Destination</th>
          </tr>
        </thead>
        <tbody>
          {detectedItems.map((item) => {
            const entry = entries[item.name];
            const dest = entry?.destination ?? '';
            const isNew = initialUnmapped.has(item.name) && !entry;
            return (
              <tr key={item.name} className={isNew ? 'mapping-row-unmapped' : ''}>
                <td className="folder-name-cell">
                  <div className="folder-name">
                    <span className="item-kind">
                      {item.kind === 'folder' ? <I.Folder size={12} /> : <I.File size={12} />}
                    </span>
                    <span className="item-name" title={item.name}>
                      {item.name}
                    </span>
                    {isNew && <span className="badge badge-warn item-new-badge">new</span>}
                  </div>
                </td>
                <td>
                  {pendingNewFor === item.name ? (
                    <span className="bucket-add">
                      <input
                        type="text"
                        autoFocus
                        placeholder="New destination name…"
                        value={newBucketName}
                        onChange={(e) => setNewBucketName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitNewBucket(item);
                          if (e.key === 'Escape') {
                            setPendingNewFor(null);
                            setNewBucketName('');
                          }
                        }}
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => commitNewBucket(item)}
                      >
                        <I.CheckCircle size={12} /> Add
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPendingNewFor(null);
                          setNewBucketName('');
                        }}
                      >
                        <I.X size={12} />
                      </button>
                    </span>
                  ) : (
                    <select
                      className="dest-select"
                      value={dest}
                      onChange={(e) => handleSelectChange(item, e.target.value)}
                    >
                      <option value="" disabled>
                        Choose destination…
                      </option>
                      {buckets.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value={IGNORE_DESTINATION}>Ignore</option>
                      <option disabled>──────────</option>
                      <option value={NEW_BUCKET_SENTINEL}>+ New destination…</option>
                    </select>
                  )}
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
          {saving ? (
            <>
              <span className="spin">
                <I.Loader size={12} />
              </span>{' '}
              Saving…
            </>
          ) : !dirty ? (
            'Saved'
          ) : (
            'Save mapping'
          )}
        </button>
      </div>
    </div>
  );
}
