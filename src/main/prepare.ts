import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  AppliedAction,
  ConflictResolutions,
  FolderRole,
  PreparedFile,
  PreparePlan,
  PreparePlanItem,
  PrepareResult
} from '../shared/types';
import { loadMapping, mergeMapping } from './mapping';
import { generateDeploymentScript } from './deploymentScript';

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function listSubdirs(p: string): Promise<string[]> {
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
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

interface WalkContext {
  changePath: string;
  finalPath: string;
  role: Exclude<FolderRole, 'IGNORE'>;
  folder: string;
}

async function walkAndPlan(
  ctx: WalkContext,
  srcDir: string,
  destDir: string,
  items: PreparePlanItem[]
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await walkAndPlan(ctx, srcPath, destPath, items);
    } else if (entry.isFile()) {
      const destSize = await safeStatSize(destPath);
      const sourceSize = (await safeStatSize(srcPath)) ?? 0;
      const relPathInChange = path.relative(ctx.changePath, srcPath).replace(/\\/g, '/');
      const relativePath = `${ctx.role}/${relPathInChange}`;

      let action: PreparePlanItem['action'];
      if (destSize === null) {
        action = 'create';
      } else if (await fileBytesEqual(srcPath, destPath)) {
        action = 'unchanged';
      } else {
        action = 'conflict';
      }

      const isBinary =
        action === 'conflict' ? (await isBinaryFile(srcPath)) || (await isBinaryFile(destPath)) : false;

      items.push({
        source: srcPath,
        destination: destPath,
        relativePath,
        role: ctx.role,
        action,
        isBinary,
        sourceSize,
        destSize
      });
    }
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

  const sourceFolders = await listSubdirs(changePath);
  const { config } = await loadMapping(customRawPath);
  const mapping = mergeMapping(config, sourceFolders);
  const finalPath = path.join(settings.finalRoot, customizationName);

  const items: PreparePlanItem[] = [];
  const ignoredFolders: string[] = [];
  const unmappedFolders: string[] = [];

  for (const folder of sourceFolders) {
    const role = mapping.folders[folder];
    if (!role) {
      unmappedFolders.push(folder);
      continue;
    }
    if (role === 'IGNORE') {
      ignoredFolders.push(folder);
      continue;
    }
    const srcDir = path.join(changePath, folder);
    const destDir = path.join(finalPath, role, folder);
    await walkAndPlan({ changePath, finalPath, role, folder }, srcDir, destDir, items);
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
