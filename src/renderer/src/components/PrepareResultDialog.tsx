import type { PrepareResult } from '../../../shared/types';

interface Props {
  result: PrepareResult;
  onClose: () => void;
  onOpenFinal: () => void;
}

export function PrepareResultDialog({ result, onClose, onOpenFinal }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Prepared {result.change}</h3>
        <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
          Final folder: <code>{result.finalPath}</code>
        </p>

        <div className="result-grid">
          <div><strong>{result.created}</strong> <span className="muted">created</span></div>
          <div><strong>{result.overwritten}</strong> <span className="muted">overwritten</span></div>
          <div><strong>{result.unchanged}</strong> <span className="muted">unchanged</span></div>
        </div>

        {result.ignored.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span className="muted">Ignored folders:</span> {result.ignored.join(', ')}
          </div>
        )}
        {result.unmapped.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span className="muted">Unmapped folders (skipped):</span> {result.unmapped.join(', ')}
          </div>
        )}

        {result.files.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>File list ({result.files.length})</summary>
            <ul className="file-result-list">
              {result.files.map((f) => (
                <li key={f.destination} className={'action-' + f.action}>
                  <span className="action-tag">{f.action}</span>
                  <span className="role-tag">{f.role}</span>
                  <code>{f.destination}</code>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={onOpenFinal}>Open FINAL folder</button>
          <button className="primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
