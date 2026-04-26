import type { PreparePlan } from '../../../shared/types';

interface Props {
  plan: PreparePlan;
  onChooseOverwrite: () => void;
  onChooseCompare: () => void;
  onCancel: () => void;
}

export function PrepareModeDialog({ plan, onChooseOverwrite, onChooseCompare, onCancel }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <h3 style={{ marginTop: 0 }}>Prepare {plan.change}</h3>
        <p className="muted" style={{ marginTop: -4 }}>
          Final folder: <code>{plan.finalPath}</code>
        </p>

        <div className="result-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div><strong>{plan.toCreate}</strong> <span className="muted">new</span></div>
          <div><strong>{plan.toUnchanged}</strong> <span className="muted">unchanged</span></div>
          <div><strong style={{ color: '#ffa500' }}>{plan.conflicts}</strong> <span className="muted">conflicts</span></div>
        </div>

        {plan.conflicts === 0 ? (
          <p style={{ marginTop: 16 }}>
            No conflicts — every file in this change either creates a new file in FINAL or is identical to what's there.
          </p>
        ) : (
          <p style={{ marginTop: 16 }}>
            <strong>{plan.conflicts}</strong> file{plan.conflicts === 1 ? '' : 's'} differ from what's already in FINAL.
            How would you like to handle them?
          </p>
        )}

        {plan.toCreate === 0 && plan.toUnchanged === 0 && plan.conflicts === 0 && (
          <div className="warn-box">
            <strong>Nothing to prepare.</strong>{' '}
            {plan.unmappedFolders.length > 0 ? (
              <>
                The following folders are not mapped to APP_UNITS or DB_UNITS:{' '}
                <code>{plan.unmappedFolders.join(', ')}</code>. Set their roles in
                the Folder mapping panel, click <em>Save mapping</em>, then try again.
              </>
            ) : (
              <>This change has no files in mapped folders.</>
            )}
          </div>
        )}

        {(plan.unmappedFolders.length > 0 || plan.ignoredFolders.length > 0) &&
          (plan.toCreate > 0 || plan.toUnchanged > 0 || plan.conflicts > 0) && (
            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
              {plan.unmappedFolders.length > 0 && (
                <div>Skipping unmapped folders: <code>{plan.unmappedFolders.join(', ')}</code></div>
              )}
              {plan.ignoredFolders.length > 0 && (
                <div>Ignoring: <code>{plan.ignoredFolders.join(', ')}</code></div>
              )}
            </div>
          )}

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel}>Cancel</button>
          {plan.conflicts > 0 && (
            <button onClick={onChooseCompare}>Compare each conflict</button>
          )}
          <button
            className="primary"
            onClick={onChooseOverwrite}
            disabled={plan.toCreate === 0 && plan.conflicts === 0}
          >
            {plan.conflicts === 0 ? 'Apply' : 'Overwrite all with new'}
          </button>
        </div>
      </div>
    </div>
  );
}
