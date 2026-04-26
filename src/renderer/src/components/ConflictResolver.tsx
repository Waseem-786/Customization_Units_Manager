import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConflictResolution,
  ConflictResolutions,
  PreparePlanItem
} from '../../../shared/types';
import { monaco, languageForFile } from '../monaco/setup';
import {
  assembleMerged,
  computeBlocks,
  countLines,
  type HunkBlock,
  type HunkSide
} from '../merge/hunks';
import { I } from './Icons';

interface Props {
  conflicts: PreparePlanItem[];
  onApply: (resolutions: ConflictResolutions) => void;
  onCancel: () => void;
}

export function ConflictResolver({ conflicts, onApply, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [resolutions, setResolutions] = useState<ConflictResolutions>({});
  const [originalCurrent, setOriginalCurrent] = useState('');
  const [originalNew, setOriginalNew] = useState('');
  const [blocks, setBlocks] = useState<HunkBlock[]>([]);
  const [hunkCount, setHunkCount] = useState(0);
  const [choices, setChoices] = useState<HunkSide[]>([]);
  const [freeEdit, setFreeEdit] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const current = conflicts[index];
  const language = useMemo(() => (current ? languageForFile(current.relativePath) : undefined), [current]);
  const merged = freeEdit ? freeText : assembleMerged(blocks, choices);
  const fromCurrent = choices.filter((c) => c === 'current').length;
  const fromNew = choices.filter((c) => c === 'new').length;

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const freeTextRef = useRef(freeText);
  useEffect(() => { freeTextRef.current = freeText; }, [freeText]);

  useEffect(() => {
    if (!current) return;
    if (current.isBinary) {
      setLoading(false);
      setOriginalCurrent(''); setOriginalNew('');
      setBlocks([]); setHunkCount(0); setChoices([]);
      setFreeEdit(false); setFreeText('');
      return;
    }
    setLoading(true); setLoadError(null); setFreeEdit(false);
    Promise.all([
      window.api.readFileText(current.destination),
      window.api.readFileText(current.source)
    ])
      .then(([cur, nu]) => {
        setOriginalCurrent(cur); setOriginalNew(nu);
        const { blocks: bs, hunkCount: hc } = computeBlocks(cur, nu);
        setBlocks(bs); setHunkCount(hc);
        setChoices(Array(hc).fill('new')); setFreeText(nu);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to read files');
      })
      .finally(() => setLoading(false));
  }, [current]);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const editor = monaco.editor.createDiffEditor(editorContainerRef.current, {
      automaticLayout: true, readOnly: true, originalEditable: false,
      theme: 'app-dark', renderSideBySide: true, minimap: { enabled: false },
      fontSize: 12.5, scrollBeyondLastLine: false
    });
    diffEditorRef.current = editor;
    return () => {
      const m = editor.getModel();
      m?.original.dispose(); m?.modified.dispose();
      editor.dispose(); diffEditorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = diffEditorRef.current;
    if (!editor) return;
    const previous = editor.getModel();
    const originalModel = monaco.editor.createModel(originalCurrent, language);
    const modifiedModel = monaco.editor.createModel(merged, language);
    editor.setModel({ original: originalModel, modified: modifiedModel });
    previous?.original.dispose(); previous?.modified.dispose();
    let sub: monaco.IDisposable | undefined;
    if (freeEdit) {
      sub = modifiedModel.onDidChangeContent(() => {
        const v = modifiedModel.getValue();
        if (v !== freeTextRef.current) setFreeText(v);
      });
    }
    return () => sub?.dispose();
  }, [originalCurrent, merged, language, freeEdit]);

  useEffect(() => { diffEditorRef.current?.updateOptions({ readOnly: !freeEdit }); }, [freeEdit]);
  useEffect(() => {
    if (!current || current.isBinary) return;
    const id = requestAnimationFrame(() => diffEditorRef.current?.layout());
    return () => cancelAnimationFrame(id);
  }, [current, loading]);

  function setMode(mode: 'pick' | 'free') {
    if (mode === 'free') { setFreeText(merged); setFreeEdit(true); }
    else setFreeEdit(false);
  }

  function pickHunk(hunkIndex: number, side: HunkSide) {
    const next = choices.slice(); next[hunkIndex] = side;
    setChoices(next); if (freeEdit) setFreeEdit(false);
  }

  function setResolution(res: ConflictResolution) {
    const updated = { ...resolutions, [current.destination]: res };
    setResolutions(updated);
    if (conflicts.every((c) => updated[c.destination])) { onApply(updated); return; }
    for (let i = 1; i <= conflicts.length; i++) {
      const candidate = (index + i) % conflicts.length;
      if (!updated[conflicts[candidate].destination]) { setIndex(candidate); break; }
    }
  }

  const currentResolution = current ? resolutions[current.destination] : undefined;
  const resolvedCount = Object.keys(resolutions).length;
  const progress = conflicts.length > 0 ? (resolvedCount / conflicts.length) * 100 : 0;

  if (!current) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal conflict-modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow left"><I.GitMerge size={11} /> Conflict {index + 1} of {conflicts.length}</div>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500 }}>
              {current.relativePath}
            </h3>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {current.isBinary && <span className="badge badge-warn">binary</span>}
              {currentResolution && (
                <span className="badge badge-emerald">
                  <I.CheckCircle size={11} /> resolved · {currentResolution.action}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><I.X /></button>
        </div>

        <div className="conflict-toolbar">
          {!current.isBinary && (
            <>
              <div className="mode-toggle">
                <button className={!freeEdit ? 'active' : ''} onClick={() => setMode('pick')}>
                  <I.Layers size={11} /> Per-hunk
                </button>
                <button className={freeEdit ? 'active' : ''} onClick={() => setMode('free')}>
                  <I.Edit size={11} /> Free edit
                </button>
              </div>
              {!freeEdit && hunkCount > 0 && (
                <span className="muted" style={{ fontSize: 'var(--fs-tiny)' }}>
                  {fromCurrent} current · {fromNew} new · {hunkCount} hunks
                </span>
              )}
            </>
          )}
          <div className="conflict-progress" title={`${resolvedCount}/${conflicts.length} resolved`}>
            <div className="conflict-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="muted" style={{ fontSize: 'var(--fs-tiny)' }}>
            {resolvedCount}/{conflicts.length} resolved
          </span>
        </div>

        <div className="diff-area">
          {!current.isBinary && (
            <div className="diff-pane-labels">
              <span className="lbl-current">CURRENT (FINAL)</span>
              <span className="lbl-merged">MERGED preview {freeEdit && '— editable'}</span>
            </div>
          )}

          <div ref={editorContainerRef} className="resolver-editor"
            style={{ display: current.isBinary ? 'none' : 'block' }} />

          {current.isBinary ? (
            <div style={{
              flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 32
            }}>
              <div>
                <I.AlertTriangle size={32} style={{ color: 'var(--warn)' }} />
                <p>This file is binary — line-by-line diff is unavailable.</p>
                <p className="muted" style={{ fontSize: 'var(--fs-tiny)' }}>
                  Source: {current.sourceSize.toLocaleString()} bytes · Current: {(current.destSize ?? 0).toLocaleString()} bytes
                </p>
                <div className="btn-row" style={{ justifyContent: 'center', marginTop: 14 }}>
                  <button className="btn btn-danger" onClick={() => setResolution({ action: 'keep-current' })}>
                    Keep CURRENT
                  </button>
                  <button className="btn btn-primary" onClick={() => setResolution({ action: 'use-new' })}>
                    Use NEW
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <p className="muted" style={{ padding: 16 }}>
              <span className="spin"><I.Loader /></span> Loading file contents…
            </p>
          ) : loadError ? (
            <div className="error" style={{ margin: 16 }}>{loadError}</div>
          ) : !freeEdit && hunkCount > 0 ? (
            <div className="hunks-list">
              {blocks
                .filter((b): b is Extract<HunkBlock, { kind: 'hunk' }> => b.kind === 'hunk')
                .map((b) => {
                  const hi = b.index;
                  const side = choices[hi] ?? 'new';
                  return (
                    <div key={hi} className={`hunk-card hunk-side-${side}`}>
                      <div className="hunk-card-header">
                        <span className="h-num">Hunk {hi + 1}</span>
                        <span className="muted">{countLines(b.current)} ↔ {countLines(b.next)} lines</span>
                        <span className="badge" style={{ marginLeft: 'auto' }}>
                          {side === 'current' ? 'using current' : 'using new'}
                        </span>
                      </div>
                      <div className="hunk-card-bodies">
                        <pre className="hunk-side-pane hunk-current-pane">
                          {b.current.length === 0 ? <em className="muted">(empty)</em> : truncate(b.current, 600)}
                        </pre>
                        <div className="hunk-arrows">
                          <button
                            className={'arrow-btn arrow-left ' + (side === 'current' ? 'active' : '')}
                            onClick={() => pickHunk(hi, 'current')} title="Use CURRENT"
                          ><I.ChevronLeft size={16} /></button>
                          <button
                            className={'arrow-btn arrow-right ' + (side === 'new' ? 'active' : '')}
                            onClick={() => pickHunk(hi, 'new')} title="Use NEW"
                          ><I.ChevronRight size={16} /></button>
                        </div>
                        <pre className="hunk-side-pane hunk-new-pane">
                          {b.next.length === 0 ? <em className="muted">(empty)</em> : truncate(b.next, 600)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : !freeEdit && hunkCount === 0 ? (
            <p className="muted" style={{ padding: 16 }}>
              Files differ at the byte level but produce no line-level diff
              (likely whitespace, line endings, or trailing newline).
            </p>
          ) : null}
        </div>

        <div className="modal-foot">
          <div className="btn-row">
            <button className="btn btn-sm" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
              <I.ChevronLeft size={12} /> Prev
            </button>
            <button className="btn btn-sm"
              onClick={() => setIndex(Math.min(conflicts.length - 1, index + 1))}
              disabled={index === conflicts.length - 1}>
              Next <I.ChevronRight size={12} />
            </button>
          </div>
          {!current.isBinary && (
            <div className="btn-row">
              <button className="btn btn-danger btn-sm" onClick={() => setResolution({ action: 'keep-current' })}>
                Keep CURRENT
              </button>
              <button className="btn btn-sm" onClick={() => setResolution({ action: 'use-new' })}>
                Use NEW
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setResolution({ action: 'merged', content: merged })}
              >
                <I.GitMerge size={12} /> Save merged
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n…';
}
