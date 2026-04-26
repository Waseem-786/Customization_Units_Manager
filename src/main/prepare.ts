import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  AppliedAction,
  ConflictResolutions,
  DetectedItem,
  MappingConfig,
  PreparedFile,
  PreparePlan,
  PreparePlanItem,
  PrepareResult
} from '../shared/types';
import { IGNORE_DESTINATION } from '../shared/types';
import { MAPPING_FILENAME, loadMapping } from './mapping';
import { generateDeploymentScript } from './deploymentScript';

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function listTopLevelEntries(p: string): Promise<DetectedItem[]> {
  const entries = await fs.readdir(p, { withFileTypes: true });
  const items: DetectedItem[] = [];
  for (const e of entries) {
    if (e.name === MAPPING_FILENAME) continue;
    if (e.isDirectory()) items.push({ name: e.name, kind: 'folder' });
    else if (e.isFile()) items.push({ name: e.name, kind: 'file' });
  }
  return items;
}

async function fileBytesEqual(a: string, b: string): Promise<boolean> {
  try {
    const [sa, sb] = await Promise.all([fs.stat(a), fs.stat(b)]);
    if (sa.size !== sb.size) return false;
    const [ba, bb] = await Promise.all([fs.readFile(a), fs.readFile(b)]);
    return ba.equals(bb);
  } catch {
    return false;
  }
}

async function isBinaryFile(filePath: string): Promise<boolean> {
  let fd: import('node:fs/promises').FileHandle | null = null;
  try {
    fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    await fd?.close();
  }
}

async function safeStatSize(p: string): Promise<number | null> {
  try {
    const s = await fs.stat(p);
    return s.size;
  } catch {
    return null;
  }
}

async function classifyFile(
  source: string,
  destination: string,
  bucket: string,
  relativePath: string,
  items: PreparePlanItem[]
): Promise<void> {
  const destSize = await safeStatSize(destination);
  const sourceSize = (await safeStatSize(source)) ?? 0;

  let action: PreparePlanItem['action'];
  if (destSize === null) action = 'create';
  else if (await fileBytesEqual(source, destination)) action = 'unchanged';
  else action = 'conflict';

  const isBinary =
    action === 'conflict' ? (await isBinaryFile(source)) || (await isBinaryFile(destination)) : false;

  items.push({
    source,
    destination,
    relativePath,
    role: bucket,
    action,
    isBinary,
    sourceSize,
    destSize
  });
}

async function walkAndPlanFolder(
  srcDir: string,
  destDir: string,
  bucket: string,
  prefix: string,
  items: PreparePlanItem[]
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      const nextPrefix = prefix + '/' + entry.name;
      await walkAndPlanFolder(srcPath, destPath, bucket, nextPrefix, items);
    } else if (entry.isFile()) {
      const rel = `${bucket}${prefix}/${entry.name}`;
      await classifyFile(srcPath, destPath, bucket, rel, items);
    }
  }
}

export interface MappingValidationError {
  reason: 'no-mapping-file' | 'unmapped-items';
  unmapped?: string[];
}

class PrepareValidationError extends Error {
  details: MappingValidationError;
  constructor(details: MappingValidationError, message: string) {
    super(message);
    this.name = 'PrepareValidationError';
    this.details = details;
  }
}

export async function planPrepareChange(
  settings: AppSettings,
  customizationName: string,
  changeName: string
): Promise<PreparePlan> {
  if (!settings.rawRoot) throw new Error('RAW root is not configured.');
  if (!settings.finalRoot) throw new Error('FINAL root is not configured.');

  const customRawPath = path.join(settings.rawRoot, customizationName);
  if (!(await dirExists(customRawPath))) {
    throw new Error(`Customization not found: ${customRawPath}`);
  }
  const changePath = path.join(customRawPath, changeName);
  if (!(await dirExists(changePath))) {
    throw new Error(`Change folder not found: ${changePath}`);
  }

  const detectedItems = await listTopLevelEntries(changePath);
  const { config, exists: mappingExists } = await loadMapping(customRawPath);

  if (!mappingExists || !config) {
    throw new PrepareValidationError(
      { reason: 'no-mapping-file' },
      `Folder mapping is not configured for "${customizationName}". Open the customization, set a destination for each item, and click Save mapping before preparing.`
    );
  }

  const unmapped = detectedItems.filter((it) => !config.entries[it.name]).map((it) => it.name);
  if (unmapped.length > 0) {
    throw new PrepareValidationError(
      { reason: 'unmapped-items', unmapped },
      `These items have no destination set: ${unmapped.join(', ')}. Open the mapping panel, choose a destination (or Ignore) for each, and save before preparing.`
    );
  }

  const mapping: MappingConfig = config;
  const finalPath = path.join(settings.finalRoot, customizationName);

  const items: PreparePlanItem[] = [];
  const ignoredFolders: string[] = [];
  const unmappedFolders: string[] = []; // never populated under strict validation

  for (const item of detectedItems) {
    const entry = mapping.entries[item.name];
    const dest = entry.destination;

    if (dest === IGNORE_DESTINATION) {
      ignoredFolders.push(item.name);
      continue;
    }

    if (item.kind === 'folder') {
      const srcDir = path.join(changePath, item.name);
      const destDir = path.join(finalPath, dest, item.name);
      await walkAndPlanFolder(srcDir, destDir, dest, '/' + item.name, items);
    } else {
      const srcFile = path.join(changePath, item.name);
      const destFile = path.join(finalPath, dest, item.name);
      const rel = `${dest}/${item.name}`;
      await classifyFile(srcFile, destFile, dest, rel, items);
    }
  }

  const toCreate = items.filter((i) => i.action === 'create').length;
  const toUnchanged = items.filter((i) => i.action === 'unchanged').length;
  const conflicts = items.filter((i) => i.action === 'conflict').length;

  return {
    customization: customizationName,
    change: changeName,
    finalPath,
    items,
    ignoredFolders,
    unmappedFolders,
    toCreate,
    toUnchanged,
    conflicts
  };
}

export async function applyPreparePlan(
  plan: PreparePlan,
  resolutions: ConflictResolutions
): Promise<PrepareResult> {
  const files: PreparedFile[] = [];

  for (const item of plan.items) {
    let action: AppliedAction;
    if (item.action === 'create') {
      await fs.mkdir(path.dirname(item.destination), { recursive: true });
      await fs.copyFile(item.source, item.destination);
      action = 'created';
    } else if (item.action === 'unchanged') {
      action = 'unchanged';
    } else {
      const resolution = resolutions[item.destination];
      if (!resolution) {
        throw new Error(`Missing resolution for conflict: ${item.relativePath}`);
      }
      if (resolution.action === 'use-new') {
        await fs.mkdir(path.dirname(item.destination), { recursive: true });
        await fs.copyFile(item.source, item.destination);
        action = 'overwritten';
      } else if (resolution.action === 'keep-current') {
        action = 'kept-current';
      } else {
        await fs.mkdir(path.dirname(item.destination), { recursive: true });
        await fs.writeFile(item.destination, resolution.content, 'utf-8');
        action = 'merged';
      }
    }
    files.push({
      source: item.source,
      destination: item.destination,
      relativePath: item.relativePath,
      role: item.role,
      action
    });
  }

  const created = files.filter((f) => f.action === 'created').length;
  const overwritten = files.filter((f) => f.action === 'overwritten').length;
  const unchanged = files.filter((f) => f.action === 'unchanged').length;
  const keptCurrent = files.filter((f) => f.action === 'kept-current').length;
  const merged = files.filter((f) => f.action === 'merged').length;

  let deploymentScript = null;
  try {
    deploymentScript = await generateDeploymentScript(plan.finalPath, plan.customization);
  } catch (err) {
    console.error('Failed to generate deployment script:', err);
  }

  return {
    customization: plan.customization,
    change: plan.change,
    finalPath: plan.finalPath,
    filesCopied: created + overwritten + merged,
    created,
    overwritten,
    unchanged,
    keptCurrent,
    merged,
    ignored: plan.ignoredFolders,
    unmapped: plan.unmappedFolders,
    files,
    deploymentScript
  };
}
