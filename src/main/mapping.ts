import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FolderRole, MappingConfig } from '../shared/types';

export const MAPPING_FILENAME = '.units-manager.json';

const DEFAULT_ROLES: Record<string, FolderRole> = {
  JS: 'APP_UNITS',
  UIXML: 'APP_UNITS',
  DDL: 'DB_UNITS',
  INC: 'DB_UNITS',
  SPC: 'DB_UNITS',
  SQL: 'DB_UNITS',
  RADXML: 'IGNORE'
};

export function suggestRoleForFolder(folderName: string): FolderRole {
  return DEFAULT_ROLES[folderName.toUpperCase()] ?? 'IGNORE';
}

export function buildSuggestedMapping(detectedFolders: string[]): MappingConfig {
  const folders: Record<string, FolderRole> = {};
  for (const f of detectedFolders) folders[f] = suggestRoleForFolder(f);
  return { version: 1, folders };
}

function mappingFilePath(customizationRawPath: string): string {
  return path.join(customizationRawPath, MAPPING_FILENAME);
}

export async function loadMapping(
  customizationRawPath: string
): Promise<{ config: MappingConfig | null; exists: boolean }> {
  const file = mappingFilePath(customizationRawPath);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as MappingConfig;
    if (parsed.version !== 1 || typeof parsed.folders !== 'object') {
      return { config: null, exists: true };
    }
    return { config: parsed, exists: true };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { config: null, exists: false };
    throw err;
  }
}

export async function saveMapping(
  customizationRawPath: string,
  mapping: MappingConfig
): Promise<MappingConfig> {
  const file = mappingFilePath(customizationRawPath);
  await fs.writeFile(file, JSON.stringify(mapping, null, 2), 'utf-8');
  return mapping;
}

export function mergeMapping(
  saved: MappingConfig | null,
  detectedFolders: string[]
): MappingConfig {
  const base = saved ?? buildSuggestedMapping(detectedFolders);
  const folders: Record<string, FolderRole> = { ...base.folders };
  for (const f of detectedFolders) {
    if (!(f in folders)) folders[f] = suggestRoleForFolder(f);
  }
  return { version: 1, folders };
}
