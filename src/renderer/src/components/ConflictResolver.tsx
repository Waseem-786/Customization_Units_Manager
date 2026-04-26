import { useEffect, useMemo, useState } from 'react';
import type {
  ConflictResolution,
  ConflictResolutions,
  PreparePlanItem
} from '../../../shared/types';
import { DiffViewer } from './DiffViewer';
import { languageForFile } from '../monaco/setup';

interface Props {
  conflicts: PreparePlanItem[];
  onApply: (resolutions: ConflictResolutions) => void;
  onCancel: () => void;
}

type Mode = 'view' | 'edit';

export function ConflictResolver({ conflicts, onApply, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [resolutions, setResolutions] = useState<ConflictResolutions>({});
  const [originalText, setOriginalText] = useState<string>('');
  const [newText, setNewText] = useState<string>('');
  const [mergedDraft, setMergedDraft] = useState<string>('');
  const [mode, setMode] = useState<Mode>('view');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const current = conflicts[index];
  const language = useMemo(
    () => (current ? languageForFile(current.relativePath) : undefined),
    [current]
  );

  useEffect(() => {
    if (!current) return;
    if (current.isBinary) {
      setLoading(false);
      setOriginalText('');
      setNewText('');
      setMergedDraft('');
      setMode('view');
      return;
    }
    setMode('view');
    setLoading(true);
    setLoadError(null);
    Promise.all([
      window.api.readFileText(current.destination),
      window.api.readFileText(current.source)
    ])
      .then(([orig, mod]) => {
        setOriginalText(orig);
        setNewText(mod);
        setMergedDraft(mod);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to read files');
      })
      .finally(() => setLoading(false));
  }, [current]);

  function setResolutionAndAdvance(res: ConflictResolution) {
    setResolutions((prev) => ({ ...prev, [current.destination]: res }));
    if (index < conflicts.length - 1) {
      setIndex(index + 1);
    }
  }

  const allResolved = conflicts.every((c) => resolutions[c.destination]);
  const currentResolution = current ? resolutions[current.destination] : undefined;

  if (!current) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-header">
          <div>
            <h3 style={{ margin: 0 }}>
              Conflict {index + 1} of {conflicts.length}
            </h3>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              <code>{current.relativePath}</code>
              {current.isBinary && (
                <span className="badge" style={{ marginLeft: 8 }}>binary</span>
              )}
              {currentResolution && (
                <span className={'badge ok'} style={{ marginLeft: 8 }}>
                  resolved: {currentResolution.action}
                </span>
              )}
            </div>
          </div>
          <button onClick={onCancel}>Cancel</button>
        </div>

        <div className="conflict-body">
          {current.isBinary ? (
            <div className="binary-notice">
              <p>This file looks binary — line-by-line diff is not available.</p>
              <p className="muted">
                Source ({current.sourceSize.toLocaleString()} bytes) vs.
                Current ({(current.destSize ?? 0).toLocaleString()} bytes)
              </p>
            </div>
          ) : loading ? (
            <p>Loading file contents…</p>
          ) : loadError ? (
            <div className="error">{loadError}</div>
          ) : (
            <>
              <div className="diff-pane-labels">
                <span>Current (in FINAL)</span>
                <span>New ({mode === 'edit' ? 'editable — your merged result' : `from ${current.relativePath.includes('/') ? current.relativePath.split('/').pop() : 'change'}`})</span>
              </div>
              <DiffViewer
                original={originalText}
                modified={mode === 'edit' ? mergedDraft : newText}
                language={language}
                modifiedEditable={mode === 'edit'}
                onModifiedChange={setMergedDraft}
              />
            </>
          )}
        </div>

        <div className="conflict-actions">
          <div className="conflict-nav">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
              ← Prev
            </button>
            <button
              onClick={() => setIndex(Math.min(conflicts.length - 1, index + 1))}
              disabled={index === conflicts.length - 1}
            >
              Next →
            </button>
          </div>
          <div className="conflict-decisions">
            <button onClick={() => setResolutionAndAdvance({ action: 'keep-current' })}>
              Keep CURRENT
            </button>
            <button onClick={() => setResolutionAndAdvance({ action: 'use-new' })}>
              Use NEW
            </button>
            {!current.isBinary && mode === 'view' && (
              <button onClick={() => setMode('edit')}>Edit merged</button>
            )}
            {!current.isBinary && mode === 'edit' && (
              <button
                className="primary"
                onClick={() =>
                  setResolutionAndAdvance({ action: 'merged', content: mergedDraft })
                }
              >
                Save merged
              </button>
            )}
          </div>
        </div>

        <div className="conflict-footer">
          <span className="muted">
            {Object.keys(resolutions).length} / {conflicts.length} resolved
          </span>
          <button
            className="primary"
            disabled={!allResolved}
            onClick={() => onApply(resolutions)}
          >
            Apply all
          </button>
        </div>
      </div>
    </div>
  );
}
