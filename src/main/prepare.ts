import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  FolderRole,
  MappingConfig,
  PrepareResult,
  PreparedFile
} from '../shared/types';
import { loadMapping } from './mapping';

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

async function fileContentEqual(a: string, b: string): Promise<boolean> {
  try {
    const [sa, sb] = await Promise.all([fs.stat(a), fs.stat(b)]);
    if (sa.size !== sb.size) return false;
    const [ba, bb] = await Promise.all([fs.readFile(a), fs.readFile(b)]);
    return ba.equals(bb);
  } catch {
    return false;
  }
}

async function copyDirRecursive(
  srcDir: string,
  destDir: string,
  role: Exclude<FolderRole, 'IGNORE'>,
  collected: PreparedFile[]
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath, role, collected);
    } else if (entry.isFile()) {
      const destExists = await fs
        .stat(destPath)
        .then(() => true)
        .catch(() => false);
      let action: PreparedFile['action'];
      if (!destExists) {
        await fs.copyFile(srcPath, destPath);
        action = 'created';
      } else if (await fileContentEqual(srcPath, destPath)) {
        action = 'unchanged';
      } else {
        await fs.copyFile(srcPath, destPath);
        action = 'overwritten';
      }
      collected.push({ source: srcPath, destination: destPath, role, action });
    }
  }
}

export async function prepareChange(
  settings: AppSettings,
  customizationName: string,
  changeName: string
): Promise<PrepareResult> {
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

  const { config } = await loadMapping(customRawPath);
  const mapping: MappingConfig = config ?? { version: 1, folders: {} };

  const finalPath = path.join(settings.finalRoot, customizationName);
  await fs.mkdir(finalPath, { recursive: true });

  const sourceFolders = await listSubdirs(changePath);
  const files: PreparedFile[] = [];
  const ignored: string[] = [];
  const unmapped: string[] = [];

  for (const folder of sourceFolders) {
    const role = mapping.folders[folder];
    if (!role) {
      unmapped.push(folder);
      continue;
    }
    if (role === 'IGNORE') {
      ignored.push(folder);
      continue;
    }
    const srcDir = path.join(changePath, folder);
    const destDir = path.join(finalPath, role, folder);
    await copyDirRecursive(srcDir, destDir, role, files);
  }

  const created = files.filter((f) => f.action === 'created').length;
  const overwritten = files.filter((f) => f.action === 'overwritten').length;
  const unchanged = files.filter((f) => f.action === 'unchanged').length;

  return {
    customization: customizationName,
    change: changeName,
    finalPath,
    filesCopied: created + overwritten,
    created,
    overwritten,
    unchanged,
    ignored,
    unmapped,
    files
  };
}
