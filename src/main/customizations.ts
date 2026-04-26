import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  ChangeDetail,
  CreateChangeResult,
  CustomizationDetail,
  CustomizationSummary,
  DetectedItem,
  FileNode
} from '../shared/types';
import { MAPPING_FILENAME, loadMapping, mergeMapping } from './mapping';

const CHANGE_FOLDER_PATTERN = /^Change[_-]?\d+$/i;
const CHANGE_NUMBER_PATTERN = /(\d+)$/;
const MAX_TREE_DEPTH = 6;

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function listSubdirs(p: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(p, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function listTopLevelEntries(p: string): Promise<DetectedItem[]> {
  try {
    const entries = await fs.readdir(p, { withFileTypes: true });
    const items: DetectedItem[] = [];
    for (const e of entries) {
      if (e.name === MAPPING_FILENAME) continue;
      if (e.isDirectory()) items.push({ name: e.name, kind: 'folder' });
      else if (e.isFile()) items.push({ name: e.name, kind: 'file' });
    }
    return items;
  } catch {
    return [];
  }
}

export async function listCustomizations(settings: AppSettings): Promise<CustomizationSummary[]> {
  if (!settings.rawRoot) return [];
  if (!(await dirExists(settings.rawRoot))) return [];

  const customizationDirs = await listSubdirs(settings.rawRoot);
  const summaries: CustomizationSummary[] = [];

  for (const name of customizationDirs) {
    const rawPath = path.join(settings.rawRoot, name);
    const subdirs = await listSubdirs(rawPath);
    const changes = subdirs.filter((d) => CHANGE_FOLDER_PATTERN.test(d)).sort();

    const finalPath = settings.finalRoot ? path.join(settings.finalRoot, name) : null;
    const hasFinal = finalPath ? await dirExists(finalPath) : false;

    summaries.push({
      name,
      rawPath,
      finalPath,
      hasFinal,
      changeCount: changes.length,
      changes
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

async function readTree(root: string, depth = 0): Promise<{ tree: FileNode[]; fileCount: number }> {
  if (depth >= MAX_TREE_DEPTH) return { tree: [], fileCount: 0 };
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return { tree: [], fileCount: 0 };
  }

  const nodes: FileNode[] = [];
  let fileCount = 0;

  for (const entry of entries) {
    if (entry.name === MAPPING_FILENAME) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const sub = await readTree(fullPath, depth + 1);
      fileCount += sub.fileCount;
      nodes.push({ name: entry.name, path: fullPath, isDir: true, children: sub.tree });
    } else if (entry.isFile()) {
      let size: number | undefined;
      try {
        const st = await fs.stat(fullPath);
        size = st.size;
      } catch {
        size = undefined;
      }
      fileCount += 1;
      nodes.push({ name: entry.name, path: fullPath, isDir: false, size });
    }
  }

  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { tree: nodes, fileCount };
}

function nextChangeName(existing: string[]): string {
  let max = 0;
  for (const name of existing) {
    const m = name.match(CHANGE_NUMBER_PATTERN);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  const next = max + 1;
  return `Change_${String(next).padStart(2, '0')}`;
}

export async function getCustomizationDetail(
  settings: AppSettings,
  name: string
): Promise<CustomizationDetail | null> {
  if (!settings.rawRoot) return null;
  const rawPath = path.join(settings.rawRoot, name);
  if (!(await dirExists(rawPath))) return null;

  const subdirs = await listSubdirs(rawPath);
  const changeDirs = subdirs.filter((d) => CHANGE_FOLDER_PATTERN.test(d)).sort();
  const nonChangeDirs = subdirs.filter((d) => !CHANGE_FOLDER_PATTERN.test(d));

  const changes: ChangeDetail[] = [];
  for (const c of changeDirs) {
    const cPath = path.join(rawPath, c);
    const { tree, fileCount } = await readTree(cPath);
    changes.push({ name: c, path: cPath, tree, fileCount });
  }

  const finalPath = settings.finalRoot ? path.join(settings.finalRoot, name) : null;
  const hasFinal = finalPath ? await dirExists(finalPath) : false;

  const detectedMap = new Map<string, DetectedItem>();
  for (const c of changeDirs) {
    const cPath = path.join(rawPath, c);
    const items = await listTopLevelEntries(cPath);
    for (const item of items) {
      if (!detectedMap.has(item.name)) detectedMap.set(item.name, item);
    }
  }
  const detectedItems = Array.from(detectedMap.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const { config: savedMapping, exists: mappingExists } = await loadMapping(rawPath);
  const mapping = mergeMapping(savedMapping, detectedItems);

  // An item is "unmapped" if the saved mapping exists but doesn't have an entry for it.
  // (Suggestions only count once explicitly saved.)
  const unmappedItems: string[] = [];
  if (mappingExists && savedMapping) {
    for (const item of detectedItems) {
      if (!savedMapping.entries[item.name]) unmappedItems.push(item.name);
    }
  } else {
    for (const item of detectedItems) unmappedItems.push(item.name);
  }

  return {
    name,
    rawPath,
    finalPath,
    hasFinal,
    changes,
    hasUnstructuredLayout: changeDirs.length === 0 && nonChangeDirs.length > 0,
    topLevelFolders: nonChangeDirs,
    detectedItems,
    mapping,
    mappingExists,
    unmappedItems
  };
}

export async function createNextChange(
  settings: AppSettings,
  name: string
): Promise<CreateChangeResult> {
  if (!settings.rawRoot) throw new Error('RAW root is not configured.');
  const rawPath = path.join(settings.rawRoot, name);
  if (!(await dirExists(rawPath))) {
    throw new Error(`Customization folder does not exist: ${rawPath}`);
  }
  const subdirs = await listSubdirs(rawPath);
  const existingChanges = subdirs.filter((d) => CHANGE_FOLDER_PATTERN.test(d));
  const next = nextChangeName(existingChanges);
  const newPath = path.join(rawPath, next);
  await fs.mkdir(newPath, { recursive: true });
  return { name: next, path: newPath };
}
