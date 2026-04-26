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
import { I } from '../components/Icons';

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
    setLoading(true); setError(null);
    try { setDetail(await window.api.getCustomizationDetail(name)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load customization'); }
    finally { setLoading(false); }
  }, [name]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreateChange() {
    setCreating(true); setError(null);
    try {
      const result = await window.api.createNextChange(name);
      await window.api.openInExplorer(result.path);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create change');
    } finally { setCreating(false); }
  }

  function handleMappingSaved(mapping: MappingConfig) {
    setDetail((prev) => (prev ? { ...prev, mapping, mappingExists: true } : prev));
  }

  async function handlePrepare(changeName: string) {
    setPreparingChange(changeName); setError(null);
    try { setActivePlan(await window.api.planPrepareChange(name, changeName)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to plan change'); }
    finally { setPreparingChange(null); }
  }

  async function applyPlan(plan: PreparePlan, resolutions: ConflictResolutions) {
    setError(null);
    try {
      const result = await window.api.applyPreparePlan(plan, resolutions);
      setPrepareResult(result); setActivePlan(null); setResolverOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply prepare plan');
    }
  }

  function handleOverwriteAll() {
    if (!activePlan) return;
    const resolutions: ConflictResolutions = {};
    for (const item of activePlan.items) if (item.action === 'conflict')
      resolutions[item.destination] = { action: 'use-new' };
    applyPlan(activePlan, resolutions);
  }

  if (loading) {
    return (
      <div className="page">
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <I.ArrowLeft size={13} /> Back
        </Link>
        <div className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="spin"><I.Loader /></span> Loading customization…
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page">
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <I.ArrowLeft size={13} /> Back
        </Link>
        <div className="empty-state">
          <div className="icon"><I.AlertTriangle /></div>
          <h2>Customization not found</h2>
          <p>The folder may have been moved or renamed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <I.ArrowLeft size={13} /> Back to customizations
      </Link>

      <div className="page-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow left">
            <I.GitBranch size={11} /> Customization
          </div>
          <h1 className="page-title" style={{ wordBreak: 'break-word' }}>{detail.name}</h1>
          <div className="path-line">
            <span className="label">RAW</span>
            <code>{detail.rawPath}</code>
          </div>
          {detail.finalPath && (
            <div className="path-line">
              <span className="label">FINAL</span>
              <code>{detail.finalPath}</code>
              {detail.hasFinal
                ? <span className="badge badge-emerald"><I.CheckCircle size={11} /> exists</span>
                : <span className="badge badge-warn"><I.AlertTriangle size={11} /> not yet created</span>}
            </div>
          )}
        </div>
        <div className="btn-row" style={{ flexShrink: 0 }}>
          <button className="btn" onClick={() => window.api.openInExplorer(detail.rawPath)}>
            <I.FolderOpen /> Open in Explorer
          </button>
          <button className="btn" onClick={refresh} title="Reload"><I.RefreshCw /></button>
          <button className="btn btn-primary" onClick={handleCreateChange} disabled={creating}>
            {creating ? <><span className="spin"><I.Loader /></span> Creating…</> : <><I.Plus /> New Change</>}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {detail.hasUnstructuredLayout && (
        <div className="card warn" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <I.AlertTriangle style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Unstructured layout detected.</strong>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--fs-small)' }}>
                Folders ({detail.topLevelFolders.join(', ')}) sit directly under this customization
                without a <code>Change_NN</code> wrapper. Click <em>New Change</em> to create
                <code> Change_01</code>, then move them in.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div>
          {detail.changes.length === 0 && !detail.hasUnstructuredLayout && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="icon"><I.GitBranch /></div>
              <h2>No changes yet</h2>
              <p>Click <em>New Change</em> to create the first change folder.</p>
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
        </div>

        <aside>
          <MappingPanel
            customizationName={detail.name}
            detectedFolders={detail.detectedFolders}
            initial={detail.mapping}
            mappingExists={detail.mappingExists}
            onSaved={handleMappingSaved}
          />
        </aside>
      </div>

      {activePlan && !resolverOpen && (
        <PrepareModeDialog
          plan={activePlan}
          onChooseOverwrite={handleOverwriteAll}
          onChooseCompare={() => setResolverOpen(true)}
          onCancel={() => setActivePlan(null)}
        />
      )}

      {activePlan && resolverOpen && (
        <ConflictResolver
          conflicts={activePlan.items.filter((i) => i.action === 'conflict')}
          onApply={(res) => applyPlan(activePlan, res)}
          onCancel={() => setResolverOpen(false)}
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
    <div className={'change-card' + (open ? ' open' : '')}>
      <div className="change-head" onClick={() => setOpen((v) => !v)}>
        <span className="chev"><I.ChevronRight size={14} /></span>
        <h4>{change.name}</h4>
        <span className="badge"><I.File size={11} />{change.fileCount} {change.fileCount === 1 ? 'file' : 'files'}</span>
        <div className="actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); window.api.openInExplorer(change.path); }}
          >
            <I.FolderOpen size={12} /> Open
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onPrepare(); }}
            disabled={preparing}
          >
            {preparing
              ? <><span className="spin"><I.Loader size={12} /></span> Preparing…</>
              : <><I.GitMerge size={12} /> Prepare units</>}
          </button>
        </div>
      </div>
      {open && (
        <div className="change-body">
          <FileTree nodes={change.tree} defaultExpandDepth={1} />
        </div>
      )}
    </div>
  );
}
