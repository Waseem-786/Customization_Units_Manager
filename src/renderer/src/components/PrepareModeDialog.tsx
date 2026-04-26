import type { PreparePlan } from '../../../shared/types';
import { I } from './Icons';

interface Props {
  plan: PreparePlan;
  onChooseOverwrite: () => void;
  onChooseCompare: () => void;
  onCancel: () => void;
}

export function PrepareModeDialog({ plan, onChooseOverwrite, onChooseCompare, onCancel }: Props) {
  const empty = plan.toCreate === 0 && plan.toUnchanged === 0 && plan.conflicts === 0;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow left">Prepare</div>
            <h3>{plan.change}</h3>
            <div className="path-line" style={{ marginTop: 6 }}>
              <span className="label">FINAL</span>
              <code>{plan.finalPath}</code>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><I.X /></button>
        </div>

        <div className="modal-body">
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-num emerald">{plan.toCreate}</div>
              <div className="stat-label">New</div>
            </div>
            <div className="stat">
              <div className="stat-num">{plan.toUnchanged}</div>
              <div className="stat-label">Unchanged</div>
            </div>
            <div className="stat">
              <div className="stat-num warn">{plan.conflicts}</div>
              <div className="stat-label">Conflicts</div>
            </div>
          </div>

          {plan.conflicts === 0 && !empty && (
            <p style={{ fontSize: 'var(--fs-small)', marginTop: 14 }}>
              No conflicts — every file either creates a new entry in FINAL or matches what is already there.
            </p>
          )}

          {plan.conflicts > 0 && (
            <p style={{ fontSize: 'var(--fs-small)', marginTop: 14 }}>
              <strong>{plan.conflicts}</strong> file{plan.conflicts === 1 ? '' : 's'} differ from FINAL.
              Pick how to resolve them.
            </p>
          )}

          {empty && (
            <div className="warn-box">
              <strong>Nothing to prepare.</strong>{' '}
              {plan.unmappedFolders.length > 0 ? (
                <>
                  Folders not yet mapped: <code>{plan.unmappedFolders.join(', ')}</code>.
                  Set their roles in the Folder mapping panel and try again.
                </>
              ) : (
                <>This change has no files in mapped folders.</>
              )}
            </div>
          )}

          {(plan.unmappedFolders.length > 0 || plan.ignoredFolders.length > 0) && !empty && (
            <div className="muted" style={{ marginTop: 12, fontSize: 'var(--fs-tiny)' }}>
              {plan.unmappedFolders.length > 0 && (
                <div>Skipping unmapped: <code>{plan.unmappedFolders.join(', ')}</code></div>
              )}
              {plan.ignoredFolders.length > 0 && (
                <div>Ignoring: <code>{plan.ignoredFolders.join(', ')}</code></div>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          {plan.conflicts > 0 && (
            <button className="btn" onClick={onChooseCompare}>
              <I.GitMerge /> Compare each conflict
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={onChooseOverwrite}
            disabled={plan.toCreate === 0 && plan.conflicts === 0}
          >
            {plan.conflicts === 0 ? <>Apply <I.ArrowRight /></> : <>Overwrite all with new <I.ArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
