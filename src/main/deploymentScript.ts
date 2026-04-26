import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { DeploymentScriptInfo } from '../shared/types';

export const DEPLOYMENT_SCRIPT_FILENAME = 'Deployment_Script.txt';
export const DB_UNITS_FOLDER_NAME = 'DB_UNITS';

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(full);
      out.push(...nested);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

export async function generateDeploymentScript(
  finalCustomizationPath: string,
  customizationName: string
): Promise<DeploymentScriptInfo | null> {
  const dbUnitsPath = path.join(finalCustomizationPath, DB_UNITS_FOLDER_NAME);
  if (!(await dirExists(dbUnitsPath))) return null;

  const files = await walkFiles(dbUnitsPath);
  if (files.length === 0) return null;

  files.sort((a, b) => {
    const ra = path.relative(dbUnitsPath, a);
    const rb = path.relative(dbUnitsPath, b);
    return ra.localeCompare(rb);
  });

  const dateStr = formatDate(new Date());
  const spoolFile = path.join(
    finalCustomizationPath,
    `${customizationName}_${dateStr}.spl`
  );

  const eol = os.EOL;
  const header = [
    `spool ${spoolFile}`,
    `ALTER SESSION SET CURRENT_SCHEMA=FLEXCUBE;`,
    `SET DEFINE OFF;`
  ];
  const body = files.map((f) => `@${f}`);
  const footer = [`SPOOL OFF;`];
  const content = [...header, ...body, ...footer].join(eol) + eol;

  await fs.mkdir(finalCustomizationPath, { recursive: true });
  const scriptPath = path.join(finalCustomizationPath, DEPLOYMENT_SCRIPT_FILENAME);
  await fs.writeFile(scriptPath, content, 'utf-8');

  return {
    filePath: scriptPath,
    spoolPath: spoolFile,
    fileCount: files.length,
    generatedAt: new Date().toISOString()
  };
}
