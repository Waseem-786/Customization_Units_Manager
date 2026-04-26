import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  ChangeDetail,
  ConflictResolutions,
  CustomizationDetail as Detail,
  MappingConfig,
  PreparePlan,
  PrepareResult
} from '../../../shared/types';
import { FileTree } from '../components/FileTree';
import { MappingPanel } from '../components/MappingPanel';
import { PrepareResultDialog } from '../components/PrepareResultDialog';
import { PrepareModeDialog } from '../components/PrepareModeDialog';
import { ConflictResolver } from '../components/ConflictResolver';

export function CustomizationDetail() {
  const { name = '' } = useParams<{ name: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prepareResult, setPrepareResult] = useState<PrepareResult | null>(null);
  const [preparingChange, setPreparingChange] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<PreparePlan | null>(null);
  const [resolverOpen, setResolverOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await window.api.getCustomizationDetail(name);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customization');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreateChange() {
    setCreating(true);
    setError(null);
    try {
      const result = await window.api.createNextChange(name);
      await window.api.openInExplorer(result.path);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create change');
    } finally {
      setCreating(false);
    }
  }

  function handleMappingSaved(mapping: MappingConfig) {
    setDetail((prev) => (prev ? { ...prev, mapping, mappingExists: true } : prev));
  }

  async function handlePrepare(changeName: string) {
    setPreparingChange(changeName);
    setError(null);
    try {
      const plan = await window.api.planPrepareChange(name, changeName);
      setActivePlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to plan change');
    } finally {
      setPreparingChange(null);
    }
  }

  async function applyPlan(plan: PreparePlan, resolutions: ConflictResolutions) {
    setError(null);
    try {
      const result = await window.api.applyPreparePlan(plan, resolutions);
      setPrepareResult(result);
      setActivePlan(null);
      setResolverOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply prepare plan');
    }
  }

  function handleOverwriteAll() {
    if (!activePlan) return;
    const resolutions: ConflictResolutions = {};
    for (const item of activePlan.items) {
      if (item.action === 'conflict') {
        resolutions[item.destination] = { action: 'use-new' };
      }
    }
    applyPlan(activePlan, resolutions);
  }

  function handleCompare() {
    setResolverOpen(true);
  }

  function handleResolverApply(resolutions: ConflictResolutions) {
    if (!activePlan) return;
    applyPlan(activePlan, resolutions);
  }

  function handleResolverCancel() {
    setResolverOpen(false);
  }

  function handleModeCancel() {
    setActivePlan(null);
  }

  if (loading) {
    return <div className="page"><p>Loading…</p></div>;
  }
  if (!detail) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back</Link>
        <div className="empty-state">
          <h2>Customization not found</h2>
          <p>The folder may have been moved or renamed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to customizations</Link>

      <div className="detail-header">
        <div>
          <h2 className="page-title">{detail.name}</h2>
          <div className="path-line">
            <span className="muted">RAW:</span> <code>{detail.rawPath}</code>
          </div>
          {detail.finalPath && (
            <div className="path-line">
              <span className="muted">FINAL:</span> <code>{detail.finalPath}</code>
              {detail.hasFinal ? (
                <span className="badge ok" style={{ marginLeft: 8 }}>exists</span>
              ) : (
                <span className="badge" style={{ marginLeft: 8 }}>not yet created</span>
              )}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button onClick={() => window.api.openInExplorer(detail.rawPath)}>Open in Explorer</button>
          <button onClick={refresh}>Refresh</button>
          <button className="primary" onClick={handleCreateChange} disabled={creating}>
            {creating ? 'Creating…' : '+ New Change'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {detail.hasUnstructuredLayout && (
        <div className="card warn">
          <strong>Unstructured layout detected.</strong>
          <p style={{ margin: '6px 0 0' }}>
            This customization has folders directly under it ({detail.topLevelFolders.join(', ')})
            but no <code>Change_NN</code> subfolder. Click <em>+ New Change</em> to create
            <code> Change_01</code>, then move these folders into it.
          </p>
        </div>
      )}

      <MappingPanel
        customizationName={detail.name}
        detectedFolders={detail.detectedFolders}
        initial={detail.mapping}
        mappingExists={detail.mappingExists}
        onSaved={handleMappingSaved}
      />

      {detail.changes.length === 0 && !detail.hasUnstructuredLayout && (
        <div className="empty-state">
          <h2>No changes yet</h2>
          <p>Click <em>+ New Change</em> to create the first change folder.</p>
        </div>
      )}

      {detail.changes.map((change, i) => (
        <ChangeAccordion
          key={change.name}
          change={change}
          defaultOpen={i === detail.changes.length - 1}
          onPrepare={() => handlePrepare(change.name)}
          preparing={preparingChange === change.name}
        />
      ))}

      {activePlan && !resolverOpen && (
        <PrepareModeDialog
          plan={activePlan}
          onChooseOverwrite={handleOverwriteAll}
          onChooseCompare={handleCompare}
          onCancel={handleModeCancel}
        />
      )}

      {activePlan && resolverOpen && (
        <ConflictResolver
          conflicts={activePlan.items.filter((i) => i.action === 'conflict')}
          onApply={handleResolverApply}
          onCancel={handleResolverCancel}
        />
      )}

      {prepareResult && detail.finalPath && (
        <PrepareResultDialog
          result={prepareResult}
          onClose={() => setPrepareResult(null)}
          onOpenFinal={() => window.api.openInExplorer(prepareResult.finalPath)}
        />
      )}
    </div>
  );
}

interface ChangeProps {
  change: ChangeDetail;
  defaultOpen: boolean;
  onPrepare: () => void;
  preparing: boolean;
}

function ChangeAccordion({ change, defaultOpen, onPrepare, preparing }: ChangeProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card change-card">
      <div className="change-header" onClick={() => setOpen((v) => !v)}>
        <span className="tree-icon">{open ? '▾' : '▸'}</span>
        <h3>{change.name}</h3>
        <span className="badge">{change.fileCount} {change.fileCount === 1 ? 'file' : 'files'}</span>
        <button
          className="link-btn"
          onClick={(e) => {
            e.stopPropagation();
            window.api.openInExplorer(change.path);
          }}
        >
          Open folder
        </button>
        <button
          className="primary small"
          onClick={(e) => {
            e.stopPropagation();
            onPrepare();
          }}
          disabled={preparing}
        >
          {preparing ? 'Preparing…' : 'Prepare units'}
        </button>
      </div>
      {open && (
        <div className="change-body">
          <FileTree nodes={change.tree} defaultExpandDepth={1} />
        </div>
      )}
    </div>
  );
}
