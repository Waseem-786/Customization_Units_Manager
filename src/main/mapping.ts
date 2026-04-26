import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DetectedItem, MappingConfig, MappingEntry } from '../shared/types';
import { IGNORE_DESTINATION } from '../shared/types';

export const MAPPING_FILENAME = '.units-manager.json';

const DEFAULT_BUCKETS = ['APP_UNITS', 'DB_UNITS'];
const DEFAULT_ROUTE: Record<string, string> = {
  JS: 'APP_UNITS',
  UIXML: 'APP_UNITS',
  DDL: 'DB_UNITS',
  INC: 'DB_UNITS',
  SPC: 'DB_UNITS',
  SQL: 'DB_UNITS',
  RADXML: IGNORE_DESTINATION
};

const FILE_EXT_DEFAULT_ROUTE: Record<string, string> = {
  '.js': 'APP_UNITS',
  '.uixml': 'APP_UNITS',
  '.ddl': 'DB_UNITS',
  '.inc': 'DB_UNITS',
  '.spc': 'DB_UNITS',
  '.sql': 'DB_UNITS'
};

function suggestForFolder(name: string): string {
  return DEFAULT_ROUTE[name.toUpperCase()] ?? IGNORE_DESTINATION;
}

function suggestForFile(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return IGNORE_DESTINATION;
  const ext = name.slice(idx).toLowerCase();
  return FILE_EXT_DEFAULT_ROUTE[ext] ?? IGNORE_DESTINATION;
}

export function suggestDestination(item: DetectedItem): string {
  return item.kind === 'folder' ? suggestForFolder(item.name) : suggestForFile(item.name);
}

function mappingFilePath(customizationRawPath: string): string {
  return path.join(customizationRawPath, MAPPING_FILENAME);
}

interface MappingV1 {
  version: 1;
  folders: Record<string, 'APP_UNITS' | 'DB_UNITS' | 'IGNORE'>;
}

function migrateV1(v1: MappingV1): MappingConfig {
  const entries: Record<string, MappingEntry> = {};
  const buckets = new Set<string>(DEFAULT_BUCKETS);
  for (const [name, role] of Object.entries(v1.folders)) {
    entries[name] = { kind: 'folder', destination: role };
    if (role !== IGNORE_DESTINATION) buckets.add(role);
  }
  return { version: 2, buckets: Array.from(buckets), entries };
}

function looksLikeV1(raw: unknown): raw is MappingV1 {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { version?: unknown }).version === 1 &&
    typeof (raw as { folders?: unknown }).folders === 'object'
  );
}

function looksLikeV2(raw: unknown): raw is MappingConfig {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { version?: unknown }).version === 2 &&
    Array.isArray((raw as { buckets?: unknown }).buckets) &&
    typeof (raw as { entries?: unknown }).entries === 'object'
  );
}

export async function loadMapping(
  customizationRawPath: string
): Promise<{ config: MappingConfig | null; exists: boolean }> {
  const file = mappingFilePath(customizationRawPath);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (looksLikeV2(parsed)) return { config: parsed, exists: true };
    if (looksLikeV1(parsed)) return { config: migrateV1(parsed), exists: true };
    return { config: null, exists: true };
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
  const sanitized: MappingConfig = {
    version: 2,
    buckets: Array.from(new Set(mapping.buckets.filter((b) => b && b !== IGNORE_DESTINATION))),
    entries: { ...mapping.entries }
  };
  await fs.writeFile(file, JSON.stringify(sanitized, null, 2), 'utf-8');
  return sanitized;
}

export function mergeMapping(
  saved: MappingConfig | null,
  detectedItems: DetectedItem[]
): MappingConfig {
  const base: MappingConfig =
    saved ?? { version: 2, buckets: [...DEFAULT_BUCKETS], entries: {} };

  const buckets = new Set<string>(base.buckets);
  for (const b of DEFAULT_BUCKETS) buckets.add(b);

  const entries: Record<string, MappingEntry> = { ...base.entries };
  for (const item of detectedItems) {
    if (!entries[item.name]) {
      const destination = suggestDestination(item);
      if (destination !== IGNORE_DESTINATION) buckets.add(destination);
      entries[item.name] = { kind: item.kind, destination };
    } else {
      // Keep saved destination but freshen the kind in case it changed.
      entries[item.name] = { ...entries[item.name], kind: item.kind };
    }
  }

  return { version: 2, buckets: Array.from(buckets), entries };
}
