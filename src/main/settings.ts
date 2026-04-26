import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../shared/types';

const DEFAULT_SETTINGS: AppSettings = { rawRoot: null, finalRoot: null };

function settingsFilePath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export async function loadSettings(): Promise<AppSettings> {
  const file = settingsFilePath();
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULT_SETTINGS };
    throw err;
  }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const file = settingsFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(settings, null, 2), 'utf-8');
  return settings;
}
