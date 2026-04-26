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
  const language = useMemo(
    () => (current ? languageForFile(current.relativePath) : undefined),
    [current]
  );

  const merged = freeEdit ? freeText : assembleMerged(blocks, choices);
  const fromCurrent = choices.filter((c) => c === 'current').length;
  const fromNew = choices.filter((c) => c === 'new').length;

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const freeTextRef = useRef(freeText);
  useEffect(() => {
    freeTextRef.current = freeText;
  }, [freeText]);

  useEffect(() => {
    if (!current) return;
    if (current.isBinary) {
      setLoading(false);
      setOriginalCurrent('');
      setOriginalNew('');
      setBlocks([]);
      setHunkCount(0);
      setChoices([]);
      setFreeEdit(false);
      setFreeText('');
      return;
    }
    setLoading(true);
    setLoadError(null);
    setFreeEdit(false);
    Promise.all([
      window.api.readFileText(current.destination),
      window.api.readFileText(current.source)
    ])
      .then(([cur, nu]) => {
        setOriginalCurrent(cur);
        setOriginalNew(nu);
        const { blocks: bs, hunkCount: hc } = computeBlocks(cur, nu);
        setBlocks(bs);
        setHunkCount(hc);
        setChoices(Array(hc).fill('new'));
        setFreeText(nu);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to read files');
      })
      .finally(() => setLoading(false));
  }, [current]);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const editor = monaco.editor.createDiffEditor(editorContainerRef.current, {
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      theme: 'app-dark',
      renderSideBySide: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false
    });
    diffEditorRef.current = editor;
    return () => {
      const m = editor.getModel();
      m?.original.dispose();
      m?.modified.dispose();
      editor.dispose();
      diffEditorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = diffEditorRef.current;
    if (!editor) return;
    const previous = editor.getModel();
    const originalModel = monaco.editor.createModel(originalCurrent, language);
    const modifiedModel = monaco.editor.createModel(merged, language);
    editor.setModel({ original: originalModel, modified: modifiedModel });
    previous?.original.dispose();
    previous?.modified.dispose();

    let sub: monaco.IDisposable | undefined;
    if (freeEdit) {
      sub = modifiedModel.onDidChangeContent(() => {
        const v = modifiedModel.getValue();
        if (v !== freeTextRef.current) setFreeText(v);
      });
    }
    return () => sub?.dispose();
  }, [originalCurrent, merged, language, freeEdit]);

  useEffect(() => {
    diffEditorRef.current?.updateOptions({ readOnly: !freeEdit });
  }, [freeEdit]);

  useEffect(() => {
    if (!current || current.isBinary) return;
    const id = requestAnimationFrame(() => diffEditorRef.current?.layout());
    return () => cancelAnimationFrame(id);
  }, [current, loading]);

  function setMode(mode: 'pick' | 'free') {
    if (mode === 'free') {
      setFreeText(merged);
      setFreeEdit(true);
    } else {
      setFreeEdit(false);
    }
  }

  function pickHunk(hunkIndex: number, side: HunkSide) {
    const next = choices.slice();
    next[hunkIndex] = side;
    setChoices(next);
    if (freeEdit) setFreeEdit(false);
  }

  function setResolution(res: ConflictResolution) {
    const updated = { ...resolutions, [current.destination]: res };
    setResolutions(updated);
    const allDone = conflicts.every((c) => updated[c.destination]);
    if (allDone) {
      onApply(updated);
      return;
    }
    for (let i = 1; i <= conflicts.length; i++) {
      const candidate = (index + i) % conflicts.length;
      if (!updated[conflicts[candidate].destination]) {
        setIndex(candidate);
        break;
      }
    }
  }

  function navTo(direction: 'next' | 'prev') {
    const editor = diffEditorRef.current;
    if (!editor) return;
    const changes = editor.getLineChanges() ?? [];
    if (changes.length === 0) return;
    const modifiedEditor = editor.getModifiedEditor();
    const cursorLine = modifiedEditor.getPosition()?.lineNumber ?? 1;
    const currentIdx = changes.findIndex(
      (c) =>
        c.modifiedStartLineNumber <= cursorLine &&
        cursorLine <= (c.modifiedEndLineNumber || c.modifiedStartLineNumber)
    );
    let target: number;
    if (currentIdx === -1) {
      target = direction === 'next' ? 0 : changes.length - 1;
    } else {
      target =
        direction === 'next'
          ? Math.min(currentIdx + 1, changes.length - 1)
          : Math.max(currentIdx - 1, 0);
    }
    const change = changes[target];
    const targetLine = change.modifiedStartLineNumber || 1;
    modifiedEditor.revealLineInCenter(targetLine);
    modifiedEditor.setPosition({ lineNumber: targetLine, column: 1 });
    modifiedEditor.focus();
  }
  function navPrev() {
    navTo('prev');
  }
  function navNext() {
    navTo('next');
  }

  const currentResolution = current ? resolutions[current.destination] : undefined;

  if (!current) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal conflict-modal">
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
                <span className="badge ok" style={{ marginLeft: 8 }}>
                  resolved: {currentResolution.action}
                </span>
              )}
            </div>
          </div>
          <button onClick={onCancel}>Cancel</button>
        </div>

        <div className="conflict-body">
          {!current.isBinary && (
            <>
              <div className="resolver-toolbar">
                <div className="mode-toggle">
                  <label>
                    <input
                      type="radio"
                      checked={!freeEdit}
                      onChange={() => setMode('pick')}
                    />
                    Per-hunk pick
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={freeEdit}
                      onChange={() => setMode('free')}
                    />
                    Free edit
                  </label>
                </div>
                <div className="resolver-nav">
                  <button
                    onClick={navPrev}
                    className="icon-btn"
                    title="Previous change in this file"
                    aria-label="Previous change"
                  >
                    ↑
                  </button>
                  <button
                    onClick={navNext}
                    className="icon-btn"
                    title="Next change in this file"
                    aria-label="Next change"
                  >
                    ↓
                  </button>
                </div>
                {!freeEdit && hunkCount > 0 && (
                  <div className="hunk-summary muted">
                    {fromCurrent} from current · {fromNew} from new ({hunkCount} hunks)
                  </div>
                )}
              </div>

              <div className="diff-pane-labels">
                <span>CURRENT (FINAL)</span>
                <span>MERGED preview {freeEdit && '— editable'}</span>
              </div>
            </>
          )}

          <div
            ref={editorContainerRef}
            className="resolver-editor"
            style={{ display: current.isBinary ? 'none' : 'block' }}
          />

          {current.isBinary ? (
            <div className="binary-notice">
              <p>This file looks binary — line-by-line diff is not available.</p>
              <p className="muted">
                Source: {current.sourceSize.toLocaleString()} bytes · Current:{' '}
                {(current.destSize ?? 0).toLocaleString()} bytes
              </p>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button onClick={() => setResolution({ action: 'keep-current' })}>
                  Keep CURRENT
                </button>
                <button
                  className="primary"
                  onClick={() => setResolution({ action: 'use-new' })}
                >
                  Use NEW
                </button>
              </div>
            </div>
          ) : loading ? (
            <p className="muted" style={{ marginTop: 12 }}>Loading file contents…</p>
          ) : loadError ? (
            <div className="error">{loadError}</div>
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
                        <strong>Hunk {hi + 1}</strong>
                        <span className="muted">
                          {countLines(b.current)} ↔ {countLines(b.next)} lines
                        </span>
                      </div>
                      <div className="hunk-card-bodies">
                        <pre className="hunk-side-pane hunk-current-pane">
                          {b.current.length === 0 ? (
                            <em className="muted">(no current content)</em>
                          ) : (
                            truncate(b.current, 600)
                          )}
                        </pre>
                        <div className="hunk-arrows">
                          <button
                            className={
                              'arrow-btn arrow-left ' +
                              (side === 'current' ? 'active' : '')
                            }
                            onClick={() => pickHunk(hi, 'current')}
                            title="Use CURRENT for this hunk"
                            aria-label="Use current side"
                          >
                            ◀
                          </button>
                          <button
                            className={
                              'arrow-btn arrow-right ' +
                              (side === 'new' ? 'active' : '')
                            }
                            onClick={() => pickHunk(hi, 'new')}
                            title="Use NEW for this hunk"
                            aria-label="Use new side"
                          >
                            ▶
                          </button>
                        </div>
                        <pre className="hunk-side-pane hunk-new-pane">
                          {b.next.length === 0 ? (
                            <em className="muted">(no new content)</em>
                          ) : (
                            truncate(b.next, 600)
                          )}
                        </pre>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : !freeEdit && hunkCount === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Files differ at the byte level but produce no line-level diff (likely
              whitespace, line endings, or trailing newline). Use one of the entire-file
              actions below.
            </p>
          ) : null}
        </div>

        <div className="conflict-actions">
          <div className="conflict-nav">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
              ← Prev conflict
            </button>
            <button
              onClick={() => setIndex(Math.min(conflicts.length - 1, index + 1))}
              disabled={index === conflicts.length - 1}
            >
              Next conflict →
            </button>
            <span className="muted" style={{ marginLeft: 12 }}>
              {Object.keys(resolutions).length} / {conflicts.length} resolved
            </span>
          </div>
          {!current.isBinary && (
            <div className="conflict-decisions">
              <button onClick={() => setResolution({ action: 'keep-current' })}>
                Keep CURRENT entirely
              </button>
              <button onClick={() => setResolution({ action: 'use-new' })}>
                Use NEW entirely
              </button>
              <button
                className="primary"
                onClick={() => setResolution({ action: 'merged', content: merged })}
                title={
                  Object.keys(resolutions).length === conflicts.length - 1
                    ? 'Save merge and write all files to FINAL'
                    : 'Save merge and continue to next conflict'
                }
              >
                Save merged
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
