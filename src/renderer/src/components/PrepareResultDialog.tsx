import type { PrepareResult } from '../../../shared/types';
import { I } from './Icons';

interface Props {
  result: PrepareResult;
  onClose: () => void;
  onOpenFinal: () => void;
}

export function PrepareResultDialog({ result, onClose, onOpenFinal }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow left">Prepared</div>
            <h3>{result.change}</h3>
            <div className="path-line" style={{ marginTop: 6 }}>
              <span className="label">FINAL</span>
              <code>{result.finalPath}</code>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><I.X /></button>
        </div>

        <div className="modal-body">
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-num emerald">{result.created}</div>
              <div className="stat-label">Created</div>
            </div>
            <div className="stat">
              <div className="stat-num warn">{result.overwritten}</div>
              <div className="stat-label">Overwritten</div>
            </div>
            <div className="stat">
              <div className="stat-num gold">{result.merged}</div>
              <div className="stat-label">Merged</div>
            </div>
            <div className="stat">
              <div className="stat-num danger">{result.keptCurrent}</div>
              <div className="stat-label">Kept</div>
            </div>
            <div className="stat">
              <div className="stat-num">{result.unchanged}</div>
              <div className="stat-label">Unchanged</div>
            </div>
          </div>

          {result.ignored.length > 0 && (
            <div className="muted" style={{ fontSize: 'var(--fs-tiny)', marginTop: 8 }}>
              <strong>Ignored:</strong> {result.ignored.join(', ')}
            </div>
          )}
          {result.unmapped.length > 0 && (
            <div className="muted" style={{ fontSize: 'var(--fs-tiny)', marginTop: 4 }}>
              <strong>Unmapped (skipped):</strong> {result.unmapped.join(', ')}
            </div>
          )}

          {result.deploymentScript && (
            <div
              className="card"
              style={{ marginTop: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <I.File size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-small)', fontWeight: 500 }}>
                  Deployment script regenerated
                </div>
                <code
                  style={{
                    display: 'block',
                    fontSize: 'var(--fs-tiny)',
                    color: 'var(--muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={result.deploymentScript.filePath}
                >
                  {result.deploymentScript.filePath} · {result.deploymentScript.fileCount} DB files
                </code>
              </div>
              <button
                className="btn btn-sm"
                onClick={() =>
                  result.deploymentScript &&
                  window.api.openInExplorer(result.deploymentScript.filePath)
                }
              >
                <I.FolderOpen size={12} /> Open
              </button>
            </div>
          )}

          {result.files.length > 0 && (
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: 'var(--fs-small)' }}>
                File list ({result.files.length})
              </summary>
              <ul className="file-result-list" style={{ marginTop: 8 }}>
                {result.files.map((f) => (
                  <li key={f.destination} className={'action-' + f.action}>
                    <span className="action-tag">{f.action}</span>
                    <span className="role-tag">{f.role}</span>
                    <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.destination}</code>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="modal-foot" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onOpenFinal}><I.FolderOpen /> Open FINAL folder</button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
