import { useState } from 'react';
import type { FileNode } from '../../../shared/types';
import { I } from './Icons';

interface Props {
  nodes: FileNode[];
  defaultExpandDepth?: number;
}

export function FileTree({ nodes, defaultExpandDepth = 1 }: Props) {
  if (nodes.length === 0) return <div className="tree-empty">Empty</div>;
  return (
    <ul className="tree">
      {nodes.map((n) => (
        <TreeNode key={n.path} node={n} depth={0} defaultExpandDepth={defaultExpandDepth} />
      ))}
    </ul>
  );
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TreeNode({ node, depth, defaultExpandDepth }:
  { node: FileNode; depth: number; defaultExpandDepth: number; }) {
  const [expanded, setExpanded] = useState(depth < defaultExpandDepth);

  if (!node.isDir) {
    return (
      <li className="tree-leaf" onDoubleClick={() => window.api.openInExplorer(node.path)}>
        <span className="tree-icon"><I.File size={11} /></span>
        <span className="tree-name">{node.name}</span>
        <span className="tree-meta">{formatSize(node.size)}</span>
      </li>
    );
  }

  const childCount = node.children?.length ?? 0;
  return (
    <li>
      <div className="tree-row" onClick={() => setExpanded((v) => !v)}>
        <span className="tree-icon">
          {expanded ? <I.ChevronDown size={11} /> : <I.ChevronRight size={11} />}
        </span>
        <span className="tree-icon" style={{ color: 'var(--gold)' }}>
          {expanded ? <I.FolderOpen size={12} /> : <I.Folder size={12} />}
        </span>
        <span className="tree-name dir">{node.name}</span>
        <span className="tree-meta">{childCount}</span>
      </div>
      {expanded && childCount > 0 && (
        <ul className="tree">
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} defaultExpandDepth={defaultExpandDepth} />
          ))}
        </ul>
      )}
    </li>
  );
}
